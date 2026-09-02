import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

import {
  getTurnstileSiteKey,
  isTurnstileConfigured,
  loadTurnstile,
  type TurnstileApi,
} from './turnstileLoader';

export type TurnstileWidgetHandle = {
  /** Discard the current token and request a fresh challenge. */
  reset: () => void;
  /** Force the widget to run now (used by `useCaptchaToken().execute()`). */
  execute: () => void;
  /** Current token, or '' when none is available yet. */
  getToken: () => string;
};

type Props = {
  /** Fires with a fresh token on success, or '' when verification is unavailable/expired. */
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: unknown) => void;
  /** Logical form name — echoed to Turnstile as `action` and checked server-side. */
  action?: string;
  className?: string;
};

/**
 * Cloudflare Turnstile, invisible-first.
 * Plan: docs/workflow/for-testing/captcha-anti-spam-hardening.md (Phase 1 / Phase 5)
 *
 * `appearance="interaction-only"` → real users see nothing; a visible challenge
 * only renders when Turnstile scores the session as suspicious, and then it sits
 * inline (no modal, no layout jump beyond its own reserved box).
 *
 * Degradation contract: if the site key is unset, or the script is blocked, or
 * loading times out, the widget calls `onVerify('')` and renders nothing. Forms
 * MUST treat an empty token as "proceed" — the server still enforces bot
 * heuristics + a durable rate limit, and (for auth) GoTrue's own captcha check.
 */
export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, Props>(function TurnstileWidget(
  { onVerify, onExpire, onError, action, className },
  ref
) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const tokenRef = useRef<string>('');
  const cleanupObserverRef = useRef<null | (() => void)>(null);
  const [hasChallenge, setHasChallenge] = useState(false);

  // Keep the latest callbacks without forcing a re-render / re-mount of the widget.
  const cbRef = useRef({ onVerify, onExpire, onError });
  cbRef.current = { onVerify, onExpire, onError };

  const setToken = useCallback((token: string) => {
    tokenRef.current = token;
    cbRef.current.onVerify(token);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        tokenRef.current = '';
        try {
          if (apiRef.current && widgetIdRef.current) {
            apiRef.current.reset(widgetIdRef.current);
          }
        } catch {
          /* no-op */
        }
      },
      execute: () => {
        try {
          if (apiRef.current && widgetIdRef.current) {
            apiRef.current.execute(containerRef.current ?? undefined, {});
          }
        } catch {
          /* no-op */
        }
      },
      getToken: () => tokenRef.current,
    }),
    []
  );

  useEffect(() => {
    if (!isTurnstileConfigured()) {
      // No key configured — unblock any form waiting on a token.
      setToken('');
      return;
    }

    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = api;
        try {
          widgetIdRef.current = api.render(containerRef.current, {
            sitekey: getTurnstileSiteKey(),
            action,
            appearance: 'interaction-only',
            size: 'flexible',
            retry: 'auto',
            'refresh-expired': 'auto',
            theme: resolvedTheme === 'dark' ? 'dark' : 'light',
            callback: (token: string) => {
              if (cancelled) return;
              setHasChallenge(false);
              setToken(token);
            },
            'error-callback': (err?: unknown) => {
              if (cancelled) return;
              tokenRef.current = '';
              cbRef.current.onError?.(err);
              // Fail open: let the form proceed; server-side defenses remain.
              cbRef.current.onVerify('');
            },
            'expired-callback': () => {
              if (cancelled) return;
              tokenRef.current = '';
              cbRef.current.onExpire?.();
              cbRef.current.onVerify('');
              try {
                apiRef.current?.reset(widgetIdRef.current ?? undefined);
              } catch {
                /* no-op */
              }
            },
            'timeout-callback': () => {
              if (cancelled) return;
              tokenRef.current = '';
              cbRef.current.onVerify('');
            },
          });
          // If Turnstile decides to show an interactive challenge it injects an
          // iframe with height > 0; reserve space only then.
          const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
              setHasChallenge(entry.contentRect.height > 4);
            }
          });
          observer.observe(containerRef.current);
          cleanupObserverRef.current = () => observer.disconnect();
        } catch (err) {
          cbRef.current.onError?.(err);
          setToken('');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        cbRef.current.onError?.(err);
        // Script blocked / timed out → degrade.
        setToken('');
      });

    return () => {
      cancelled = true;
      cleanupObserverRef.current?.();
      cleanupObserverRef.current = null;
      try {
        if (apiRef.current && widgetIdRef.current) {
          apiRef.current.remove(widgetIdRef.current);
        }
      } catch {
        /* no-op */
      }
      widgetIdRef.current = null;
    };
    // Re-mount the widget when the theme flips (Turnstile can't re-theme in place)
    // or the action changes.
  }, [resolvedTheme, action, setToken]);

  if (!isTurnstileConfigured()) return null;

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div
        ref={containerRef}
        data-testid="turnstile-widget"
        aria-hidden={!hasChallenge}
        className={cn(
          'flex justify-center transition-[min-height]',
          hasChallenge ? 'min-h-[65px]' : 'min-h-0'
        )}
      />
      {/* Announce only the interactive-challenge case; the invisible pass is silent. */}
      <p role="status" aria-live="polite" className="sr-only">
        {hasChallenge ? 'Human verification needed — complete the challenge to continue.' : ''}
      </p>
    </div>
  );
});
