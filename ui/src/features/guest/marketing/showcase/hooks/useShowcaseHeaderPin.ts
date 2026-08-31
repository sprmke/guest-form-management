import { useLayoutEffect, useState, type CSSProperties } from 'react';

import {
  readShowcaseScopeTheme,
  resolveShowcaseScrollRoot,
  type ShowcaseScopeThemeSnapshot,
} from '@/features/guest/marketing/showcase/lib/showcaseScroll';

const HEADER_Z = 90;

export type ShowcaseHeaderPin = {
  style: CSSProperties;
  theme: ShowcaseScopeThemeSnapshot | null;
};

/**
 * Pin the showcase / stay-guide header with `position: fixed` (portaled to
 * `document.body`) so Admin PageTransition transforms, `@container` layout
 * containment, and warm-tint `filter` cannot trap sticky/fixed against a
 * scrolling ancestor. Live → viewport; Page Editor / embed → preview frame rect.
 */
export function useShowcaseHeaderPin(options: {
  enabled: boolean;
  containedChrome: boolean;
  embed: boolean;
}): ShowcaseHeaderPin | null {
  const needsFrame = options.containedChrome || options.embed;
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  const [style, setStyle] = useState<CSSProperties | null>(() =>
    options.enabled && !needsFrame
      ? { position: 'fixed', top: 0, left: 0, right: 0, zIndex: HEADER_Z }
      : null
  );
  const [theme, setTheme] = useState<ShowcaseScopeThemeSnapshot | null>(null);

  useLayoutEffect(() => {
    if (!options.enabled) {
      setScrollRoot(null);
      return;
    }
    if (!needsFrame) {
      setScrollRoot(null);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    const bind = () => {
      if (cancelled) return;
      const root = resolveShowcaseScrollRoot({
        embed: options.embed,
        containedChrome: options.containedChrome,
      });
      if (!root) {
        rafId = requestAnimationFrame(bind);
        return;
      }
      setScrollRoot(root);
    };
    bind();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [options.enabled, needsFrame, options.containedChrome, options.embed]);

  useLayoutEffect(() => {
    if (!options.enabled) {
      setStyle(null);
      setTheme(null);
      return;
    }

    const syncTheme = () => {
      setTheme(readShowcaseScopeTheme());
    };

    if (!needsFrame) {
      setStyle({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: HEADER_Z,
      });
      syncTheme();
      return;
    }

    if (!scrollRoot) {
      setStyle(null);
      return;
    }

    const sync = () => {
      const rect = scrollRoot.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        zIndex: HEADER_Z,
      });
      syncTheme();
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(scrollRoot);
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
    };
  }, [options.enabled, needsFrame, scrollRoot]);

  if (!options.enabled || !style) return null;
  return { style, theme };
}
