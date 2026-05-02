import { Mail, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useDisconnectGmailMail,
  useGmailMailIntegrationStatus,
  useStartGmailMailOAuth,
} from '@/features/admin/hooks/useGmailMailIntegration';

export function GmailMailIntegrationCard() {
  const { data, isLoading, isError, error, refetch } =
    useGmailMailIntegrationStatus();
  const startOAuth = useStartGmailMailOAuth();
  const disconnect = useDisconnectGmailMail();

  const connected = data?.connected ?? false;

  return (
    <section
      className={cn(
        'rounded-xl border border-sidebar-border bg-card px-3 py-3 sm:px-4 sm:py-3.5',
        'shadow-sm',
      )}
      aria-labelledby="gmail-integration-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'shrink-0 flex size-10 sm:size-11 items-center justify-center rounded-lg',
              connected
                ? 'bg-emerald-500/15 text-emerald-700'
                : 'bg-slate-100 text-slate-500',
            )}
          >
            <Mail className="size-5 sm:size-[22px]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2
              id="gmail-integration-heading"
              className="text-sm font-bold text-sidebar-foreground sm:text-[13px]"
            >
              Gmail (listener)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 sm:text-[11px] leading-snug">
              Connect the mailbox{' '}
              <span className="font-medium text-sidebar-foreground/90">
                gmail-listener
              </span>{' '}
              polls for Azure approval PDFs. Uses read-only Gmail access;
              refresh token is stored encrypted on the server.
            </p>
            {isLoading && (
              <p className="text-xs text-slate-400 mt-1">Loading status…</p>
            )}
            {isError && (
              <p className="text-xs text-destructive mt-1">
                {String((error as Error)?.message ?? error)}
              </p>
            )}
            {!isLoading &&
              !isError &&
              connected &&
              data?.googleAccountEmail && (
                <p className="text-xs text-emerald-800 mt-1.5 font-medium sm:text-[11px]">
                  Connected as {data.googleAccountEmail}
                </p>
              )}
            {!isLoading && !isError && !connected && (
              <p className="text-xs text-amber-800/90 mt-1.5 sm:text-[11px]">
                Not connected via the app — legacy{' '}
                <code className="text-[10px] bg-slate-100 px-1 rounded">
                  npm run gmail-auth
                </code>{' '}
                env vars still work if set.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button
            type="button"
            disabled={startOAuth.isPending || disconnect.isPending}
            onClick={() => {
              startOAuth.mutate(undefined, {
                onError: (e) => toast.error((e as Error).message),
              });
            }}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg min-h-[44px] px-4',
              'text-sm font-semibold text-white sm:text-[13px]',
              'bg-sidebar-primary hover:opacity-90 active:scale-[0.99] transition-all',
              'disabled:opacity-40 disabled:pointer-events-none',
            )}
          >
            <Mail className="size-4 shrink-0" aria-hidden />
            {connected ? 'Reconnect Gmail' : 'Connect Gmail'}
          </button>

          {connected && (
            <button
              type="button"
              disabled={disconnect.isPending || startOAuth.isPending}
              onClick={() => {
                disconnect.mutate(undefined, {
                  onSuccess: () => {
                    toast.success('Gmail disconnected for this deployment');
                    void refetch();
                  },
                  onError: (e) => toast.error((e as Error).message),
                });
              }}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg min-h-[44px] px-3',
                'text-sm font-semibold border border-sidebar-border bg-background sm:text-[13px]',
                'hover:bg-sidebar-accent/40 transition-colors',
                'disabled:opacity-40 disabled:pointer-events-none',
              )}
            >
              <Unplug className="size-4 shrink-0" aria-hidden />
              Disconnect
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
