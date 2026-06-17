import * as React from 'react';
import { History, Mail, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyToastError } from '@/lib/toastMessages';
import { cn } from '@/lib/utils';
import { HistoricalApprovalBackfillDialog } from '@/features/admin/components/HistoricalApprovalBackfillDialog';
import { GmailMailIntegrationCardSkeleton } from '@/components/skeletons/AdminSkeletons';
import {
  useDisconnectGmailMail,
  useGmailMailIntegrationStatus,
  useStartGmailMailOAuth,
} from '@/features/admin/hooks/useGmailMailIntegration';

type Props = {
  /** `embedded` nests inside Settings → Integrations → Google. */
  variant?: 'card' | 'embedded';
};

export function GmailMailIntegrationCard({ variant = 'card' }: Props) {
  const { data, isLoading, isError, error, refetch } =
    useGmailMailIntegrationStatus();
  const startOAuth = useStartGmailMailOAuth();
  const disconnect = useDisconnectGmailMail();

  const connected = data?.connected ?? false;
  const [backfillModalOpen, setBackfillModalOpen] = React.useState(false);
  const embedded = variant === 'embedded';

  const busy = startOAuth.isPending || disconnect.isPending || isLoading;

  const backfillDialog = (
    <HistoricalApprovalBackfillDialog
      open={backfillModalOpen}
      onOpenChange={setBackfillModalOpen}
      variant="settings"
    />
  );

  if (isLoading) {
    return (
      <>
        <GmailMailIntegrationCardSkeleton embedded={embedded} />
        {backfillDialog}
      </>
    );
  }

  const content = (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        embedded && 'rounded-lg bg-muted/20 px-3 py-3',
      )}
    >
      <div className="flex gap-3 items-start min-w-0">
        <div
          className={cn(
            'flex justify-center items-center rounded-lg shrink-0 size-10 sm:size-11',
            connected
              ? 'text-emerald-700 bg-emerald-500/15'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Mail className="size-5 sm:size-[22px]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3
            id="gmail-integration-heading"
            className="text-sm font-bold text-sidebar-foreground sm:text-[13px]"
          >
            Gmail
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 sm:text-[11px] leading-snug">
            Connect the inbox for Azure approval replies. GAF and pet PDFs sync
            automatically.
          </p>
          {isError && (
            <p className="mt-1 text-xs text-destructive">
              {String((error as Error)?.message ?? error)}
            </p>
          )}
          {!isError && connected && data?.googleAccountEmail && (
            <p className="text-xs text-emerald-800 mt-1.5 font-medium sm:text-[11px] dark:text-emerald-300">
              Connected as {data.googleAccountEmail}
            </p>
          )}
          {!isError && !connected && (
            <p className="text-xs text-amber-800/90 mt-1.5 sm:text-[11px] dark:text-amber-200">
              Not connected — connect to process approvals automatically.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-wrap gap-2 items-center sm:flex-row sm:shrink-0">
        <button
          type="button"
          disabled={startOAuth.isPending || disconnect.isPending}
          onClick={() => {
            startOAuth.mutate(undefined, {
              onError: (e) => toast.error(friendlyToastError(e, 'Could not connect Gmail')),
            });
          }}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg min-h-[44px] px-4',
            'text-sm font-semibold border border-primary/30 bg-primary/5 text-primary sm:text-[13px]',
            'transition-colors hover:bg-primary/10 hover:border-primary/40',
            'disabled:opacity-40 disabled:pointer-events-none w-full sm:w-auto',
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
                  toast.success('Gmail disconnected');
                  void refetch();
                },
                onError: (e) => toast.error(friendlyToastError(e, 'Could not disconnect Gmail')),
              });
            }}
            className={cn(
              'inline-flex gap-2 justify-center items-center px-3 rounded-lg min-h-[44px]',
              'text-sm font-semibold border border-sidebar-border bg-background sm:text-[13px]',
              'transition-colors hover:bg-sidebar-accent/40',
              'w-full disabled:opacity-40 disabled:pointer-events-none sm:w-auto',
            )}
          >
            <Unplug className="size-4 shrink-0" aria-hidden />
            Disconnect
          </button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => setBackfillModalOpen(true)}
          title="Find approval emails from before Gmail was connected"
          className={cn(
            'inline-flex gap-2 justify-center items-center px-3 rounded-lg min-h-[44px] sm:px-4',
            'text-sm font-semibold border border-sidebar-border bg-background sm:text-[13px]',
            'transition-colors hover:bg-sidebar-accent/40',
            'w-full disabled:opacity-40 disabled:pointer-events-none sm:w-auto',
          )}
        >
          <History className="size-4 shrink-0" aria-hidden />
          Import older approvals
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <>
        {backfillDialog}
        {content}
      </>
    );
  }

  return (
    <section
      className={cn(
        'surface-card w-full px-3 py-3 sm:px-4 sm:py-3.5',
        'shadow-sm',
      )}
      aria-labelledby="gmail-integration-heading"
    >
      {backfillDialog}
      {content}
    </section>
  );
}
