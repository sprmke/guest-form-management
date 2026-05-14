import * as React from 'react';
import { History, Mail, ScanSearch, Unplug, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  useDisconnectGmailMail,
  useGmailMailIntegrationStatus,
  useStartGmailMailOAuth,
} from '@/features/admin/hooks/useGmailMailIntegration';
import { useRunGmailApprovalBackfill } from '@/features/admin/hooks/useTransitionBooking';

type BackfillModalMode = 'preview' | 'apply';

export function GmailMailIntegrationCard() {
  const { data, isLoading, isError, error, refetch } =
    useGmailMailIntegrationStatus();
  const startOAuth = useStartGmailMailOAuth();
  const disconnect = useDisconnectGmailMail();
  const backfill = useRunGmailApprovalBackfill();

  const connected = data?.connected ?? false;
  const [backfillModalOpen, setBackfillModalOpen] = React.useState(false);
  const [backfillMode, setBackfillMode] =
    React.useState<BackfillModalMode>('preview');
  const [applyAcknowledged, setApplyAcknowledged] = React.useState(false);

  const resetBackfillModal = React.useCallback(() => {
    setBackfillMode('preview');
    setApplyAcknowledged(false);
  }, []);

  const busy =
    startOAuth.isPending ||
    disconnect.isPending ||
    backfill.isPending ||
    isLoading;

  const canRunApply = backfillMode === 'apply' && applyAcknowledged;

  const runBackfill = (dryRun: boolean) => {
    backfill.mutate(
      { dryRun },
      {
        onSuccess: (r) => {
          const summary = [
            r.dryRun ? `Dry run` : `Applied`,
            r.scannedBookings != null
              ? `${r.scannedBookings} bookings scanned`
              : null,
            r.tasks != null ? `${r.tasks} tasks` : null,
            r.applied != null ? `${r.applied} applied` : null,
            r.wouldApply != null ? `${r.wouldApply} would apply` : null,
            r.failed != null && r.failed > 0 ? `${r.failed} failed` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          toast.success(summary || 'Backfill finished');
          setBackfillModalOpen(false);
          resetBackfillModal();
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const onBackfillConfirm = () => {
    if (backfillMode === 'apply' && !applyAcknowledged) return;
    runBackfill(backfillMode === 'preview');
  };

  return (
    <section
      className={cn(
        'w-full rounded-xl border border-sidebar-border bg-card px-3 py-3 sm:px-4 sm:py-3.5',
        'shadow-sm',
      )}
      aria-labelledby="gmail-integration-heading"
    >
      <Dialog
        open={backfillModalOpen}
        onOpenChange={(open) => {
          setBackfillModalOpen(open);
          if (open) resetBackfillModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historical approval backfill</DialogTitle>
            <DialogDescription>
              Search Gmail for Azure approval replies that landed before{' '}
              <span className="font-medium text-foreground/90">
                gmail-listener
              </span>{' '}
              had a cursor (or missed a poll). Server defaults apply (for
              example ~180‑day Gmail lookback, capped booking batch size).
            </DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              How should this run?
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBackfillMode('preview');
                  setApplyAcknowledged(false);
                }}
                className={cn(
                  'rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2',
                  backfillMode === 'preview'
                    ? 'border-sidebar-primary bg-sidebar-primary/10 ring-2 ring-sidebar-primary/30'
                    : 'border-sidebar-border hover:bg-sidebar-accent/30',
                  'disabled:pointer-events-none disabled:opacity-40',
                )}
              >
                <span className="flex items-start gap-2">
                  <ScanSearch
                    className="mt-0.5 size-5 shrink-0 text-sidebar-primary"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-sidebar-foreground sm:text-[13px]">
                      Preview only
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground sm:text-[11px] leading-snug">
                      Dry run: shows what would match. No uploads or workflow
                      changes.
                    </span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setBackfillMode('apply')}
                className={cn(
                  'rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
                  backfillMode === 'apply'
                    ? 'border-destructive/60 bg-destructive/10 ring-2 ring-destructive/25'
                    : 'border-sidebar-border hover:bg-sidebar-accent/30',
                  'disabled:pointer-events-none disabled:opacity-40',
                )}
              >
                <span className="flex items-start gap-2">
                  <Zap
                    className="mt-0.5 size-5 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-sidebar-foreground sm:text-[13px]">
                      Apply for real
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground sm:text-[11px] leading-snug">
                      Uploads matching PDFs and may advance booking workflow
                      (calendar / sheet updates follow the backfill service).
                    </span>
                  </span>
                </span>
              </button>
            </div>
          </fieldset>

          {backfillMode === 'apply' && (
            <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3">
              <div className="flex gap-3 min-h-[44px] items-start">
                <input
                  id="backfill-apply-ack"
                  type="checkbox"
                  checked={applyAcknowledged}
                  onChange={(e) => setApplyAcknowledged(e.target.checked)}
                  className={cn(
                    'mt-1 size-5 shrink-0 rounded border-sidebar-border',
                    'text-sidebar-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2',
                  )}
                />
                <Label
                  htmlFor="backfill-apply-ack"
                  className="text-xs font-normal leading-snug text-sidebar-foreground sm:text-[11px] cursor-pointer"
                >
                  I understand this will write to storage and may change booking
                  status for matches. I have reviewed pending bookings or ran a
                  preview first.
                </Label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto border-sidebar-border"
              disabled={busy}
              onClick={() => setBackfillModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={backfillMode === 'apply' ? 'destructive' : 'default'}
              className="min-h-[44px] w-full sm:w-auto"
              disabled={busy || (backfillMode === 'apply' && !canRunApply)}
              onClick={onBackfillConfirm}
            >
              {backfill.isPending
                ? 'Running…'
                : backfillMode === 'preview'
                  ? 'Run preview'
                  : 'Apply backfill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              polls for Azure approval PDFs.
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
            disabled={
              startOAuth.isPending || disconnect.isPending || backfill.isPending
            }
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

          <button
            type="button"
            disabled={busy}
            onClick={() => setBackfillModalOpen(true)}
            title="Search Gmail history for Azure approval PDFs missed after the listener was initialized"
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg min-h-[44px] px-3 sm:px-4',
              'text-sm font-semibold border border-sidebar-border bg-background sm:text-[13px]',
              'hover:bg-sidebar-accent/40 transition-colors',
              'disabled:opacity-40 disabled:pointer-events-none',
            )}
          >
            <History className="size-4 shrink-0" aria-hidden />
            Historical backfill
          </button>

          {connected && (
            <button
              type="button"
              disabled={
                disconnect.isPending ||
                startOAuth.isPending ||
                backfill.isPending
              }
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
