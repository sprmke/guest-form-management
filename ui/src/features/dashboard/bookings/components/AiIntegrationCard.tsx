import * as React from 'react';

import { Activity } from 'lucide-react';
import { toast } from 'sonner';

import {
  useVerifyAiIntegration,
  type AiIntegrationVerifyDto,
} from '@/features/dashboard/bookings/hooks/useAiIntegration';

import { GeminiMark } from '@/components/branding/GeminiMark';
import { GroqMark } from '@/components/branding/GroqMark';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

type Props = {
  /** Primary AI provider keys present in Edge env. */
  primaryKeysConfigured: boolean;
  /** Optional fallback provider key present in Edge env. */
  fallbackKeyConfigured?: boolean;
  variant?: 'default' | 'nested';
};

function formatVerifySummary(v: AiIntegrationVerifyDto): string | undefined {
  if (v.ok) return undefined;
  if (v.error) return friendlyToastError(new Error(v.error), 'Connection failed');
  return 'Connection failed';
}

function formatConnectionDetail(v: AiIntegrationVerifyDto): string {
  const parts = ['Connection OK'];
  if (v.latencyMs != null) parts[0] += ` (${v.latencyMs} ms)`;
  return parts.join(' · ');
}

type AiProviderKind = 'gemini' | 'groq' | 'none';

function resolveAiProvider(
  primaryKeysConfigured: boolean,
  fallbackKeyConfigured: boolean
): AiProviderKind {
  if (primaryKeysConfigured) return 'gemini';
  if (fallbackKeyConfigured) return 'groq';
  return 'none';
}

function AiProviderIcon({ provider }: { provider: AiProviderKind }) {
  if (provider === 'groq') {
    return <GroqMark className="size-5 sm:size-[22px]" />;
  }
  return <GeminiMark className="size-5 sm:size-[22px]" />;
}

export function AiIntegrationCard({
  primaryKeysConfigured,
  fallbackKeyConfigured = false,
  variant = 'default',
}: Props) {
  const verify = useVerifyAiIntegration();
  const [lastResult, setLastResult] = React.useState<AiIntegrationVerifyDto | null>(null);

  const keysConfigured = primaryKeysConfigured || fallbackKeyConfigured;
  const connected = lastResult?.ok === true;
  const tested = lastResult != null;
  const busy = verify.isPending;
  const provider = resolveAiProvider(primaryKeysConfigured, fallbackKeyConfigured);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        variant === 'default' && 'bg-muted/20 rounded-lg px-3 py-3'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            'border-border bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border sm:size-11',
            connected && provider === 'gemini' && 'border-blue-500/20 bg-blue-500/10',
            connected && provider === 'groq' && 'border-[#F55036]/25 bg-[#F55036]/10',
            !connected &&
              keysConfigured &&
              provider === 'gemini' &&
              'border-blue-500/15 bg-blue-500/[0.06]',
            !connected &&
              keysConfigured &&
              provider === 'groq' &&
              'border-[#F55036]/20 bg-[#F55036]/[0.06]',
            !keysConfigured && 'bg-muted/40'
          )}
        >
          <AiProviderIcon provider={provider} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sidebar-foreground text-sm font-bold sm:text-[14px]">AI services</h3>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug sm:text-[12px]">
            Document checks, validations, and other AI-powered features.
          </p>
          {!keysConfigured ? (
            <p className="mt-1.5 text-xs text-amber-800/90 sm:text-[12px] dark:text-amber-200">
              No API keys configured — AI features are skipped when keys are missing.
            </p>
          ) : null}
          {keysConfigured && !tested ? (
            <p className="text-muted-foreground mt-1.5 text-xs sm:text-[12px]">
              Run a connection test to confirm AI services are working.
            </p>
          ) : null}
          {tested && connected ? (
            <p className="mt-1.5 text-xs font-medium text-emerald-800 sm:text-[12px] dark:text-emerald-300">
              {formatConnectionDetail(lastResult)}
            </p>
          ) : null}
          {tested && !connected ? (
            <p className="text-destructive mt-1.5 text-xs sm:text-[12px]">
              {lastResult.error ?? 'Connection test failed'}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={busy || !primaryKeysConfigured}
        onClick={() =>
          verify.mutate(undefined, {
            onSuccess: (v) => {
              setLastResult(v);
              if (v.ok) {
                toast.success('AI connection verified');
              } else {
                const description = formatVerifySummary(v);
                toast.error('AI connection failed', description ? { description } : undefined);
              }
            },
            onError: (e) => toast.error(friendlyToastError(e, 'Connection test failed')),
          })
        }
        title={
          primaryKeysConfigured
            ? 'Ping configured AI providers'
            : 'Set primary AI API keys in Edge secrets first'
        }
        className={cn(
          'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 sm:px-4',
          'border-sidebar-border bg-background border text-sm font-semibold sm:text-[13px]',
          'hover:bg-sidebar-accent/40 transition-colors',
          'w-full disabled:pointer-events-none disabled:opacity-40 sm:w-auto sm:shrink-0'
        )}
      >
        <Activity className="size-4 shrink-0" aria-hidden />
        {busy ? 'Testing…' : 'Test connection'}
      </button>
    </div>
  );
}
