import * as React from 'react';
import { Activity, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyToastError } from '@/lib/toastMessages';
import { cn } from '@/lib/utils';
import {
  useVerifyGeminiIntegration,
  type GeminiIntegrationVerifyDto,
} from '@/features/admin/hooks/useGeminiIntegration';

type Props = {
  /** From app-settings secretsStatus — key present in Edge env. */
  apiKeyConfigured: boolean;
};

function formatVerifySummary(v: GeminiIntegrationVerifyDto): string | undefined {
  if (v.ok) return undefined;
  if (v.error) return friendlyToastError(new Error(v.error), 'Connection failed');
  return 'Connection failed';
}

export function GeminiIntegrationCard({ apiKeyConfigured }: Props) {
  const verify = useVerifyGeminiIntegration();
  const [lastResult, setLastResult] =
    React.useState<GeminiIntegrationVerifyDto | null>(null);

  const connected = lastResult?.ok === true;
  const tested = lastResult != null;
  const busy = verify.isPending;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-muted/20 px-3 py-3">
      <div className="flex gap-3 items-start min-w-0">
        <div
          className={cn(
            'flex justify-center items-center rounded-lg shrink-0 size-10 sm:size-11',
            connected
              ? 'text-violet-700 bg-violet-500/15 dark:text-violet-300'
              : apiKeyConfigured
                ? 'text-amber-800 bg-amber-500/15 dark:text-amber-200'
                : 'bg-muted text-muted-foreground',
          )}
        >
          <Sparkles className="size-5 sm:size-[22px]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-sidebar-foreground sm:text-[13px]">
            Gemini receipt AI
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 sm:text-[11px] leading-snug">
            AI-checks receipt uploads via Gemini Flash. Set{' '}
            <span className="font-mono text-[10px] sm:text-[11px]">
              GEMINI_API_KEY
            </span>{' '}
            in Edge secrets.
          </p>
          {!apiKeyConfigured ? (
            <p className="text-xs text-amber-800/90 mt-1.5 sm:text-[11px] dark:text-amber-200">
              API key not configured — receipt AI is skipped on upload.
            </p>
          ) : null}
          {apiKeyConfigured && !tested ? (
            <p className="text-xs text-muted-foreground mt-1.5 sm:text-[11px]">
              Key detected. Run a connection test to confirm the API responds.
            </p>
          ) : null}
          {tested && connected ? (
            <p className="text-xs text-emerald-800 mt-1.5 font-medium sm:text-[11px] dark:text-emerald-300">
              Connection OK
              {lastResult.latencyMs != null
                ? ` (${lastResult.latencyMs} ms)`
                : ''}
            </p>
          ) : null}
          {tested && !connected ? (
            <p className="text-xs text-destructive mt-1.5 sm:text-[11px]">
              {lastResult.error ?? 'Connection test failed'}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={busy || !apiKeyConfigured}
        onClick={() =>
          verify.mutate(undefined, {
            onSuccess: (v) => {
              setLastResult(v);
              if (v.ok) {
                toast.success('Receipt AI is connected');
              } else {
                const description = formatVerifySummary(v);
                toast.error('Receipt AI connection failed', description ? { description } : undefined);
              }
            },
            onError: (e) => toast.error(friendlyToastError(e, 'Connection test failed')),
          })
        }
        title={
          apiKeyConfigured
            ? 'Ping Gemini Flash with the configured API key'
            : 'Set GEMINI_API_KEY in Edge secrets first'
        }
        className={cn(
          'inline-flex gap-2 justify-center items-center px-3 rounded-lg min-h-[44px] sm:px-4',
          'text-sm font-semibold border border-sidebar-border bg-background sm:text-[13px]',
          'transition-colors hover:bg-sidebar-accent/40',
          'w-full disabled:opacity-40 disabled:pointer-events-none sm:w-auto sm:shrink-0',
        )}
      >
        <Activity className="size-4 shrink-0" aria-hidden />
        {busy ? 'Testing…' : 'Test connection'}
      </button>
    </div>
  );
}
