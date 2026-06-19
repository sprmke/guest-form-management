import * as React from 'react';
import { ScanSearch, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { gmailApprovalBackfillToast } from '@/lib/toastMessages';
import { friendlyToastError } from '@/lib/toastMessages';
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
  useRunGmailApprovalBackfill,
  type GmailApprovalBackfillInput,
} from '@/features/admin/hooks/useTransitionBooking';
import { useGmailReconnectPromptOptional } from '@/features/admin/components/GmailReconnectProvider';
import { HISTORICAL_BACKFILL_LISTENER_CUTOFF } from '@/features/admin/lib/historicalBackfillEligibility';

type BackfillModalMode = 'preview' | 'apply';

export type HistoricalApprovalBackfillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, backfill scans only this booking (booking detail flow). */
  bookingId?: string;
  variant?: 'settings' | 'booking-detail';
  onRunSuccess?: () => void;
  /** Called when the user dismisses without applying (Cancel or overlay). */
  onDismiss?: () => void;
};

function buildBackfillToastSummary(
  r: {
    dryRun?: boolean;
    scannedBookings?: number;
    tasks?: number;
    applied?: number;
    wouldApply?: number;
    failed?: number;
  },
  scopedBooking: boolean,
): string {
  return gmailApprovalBackfillToast(r, scopedBooking);
}

export function HistoricalApprovalBackfillDialog({
  open,
  onOpenChange,
  bookingId,
  variant = 'settings',
  onRunSuccess,
  onDismiss,
}: HistoricalApprovalBackfillDialogProps) {
  const backfill = useRunGmailApprovalBackfill(bookingId);
  const gmailReconnect = useGmailReconnectPromptOptional();
  const closedAfterSuccessRef = React.useRef(false);
  const [backfillMode, setBackfillMode] =
    React.useState<BackfillModalMode>('preview');
  const [applyAcknowledged, setApplyAcknowledged] = React.useState(false);

  const resetBackfillModal = React.useCallback(() => {
    setBackfillMode('preview');
    setApplyAcknowledged(false);
  }, []);

  const busy = backfill.isPending;
  const canRunApply = backfillMode === 'apply' && applyAcknowledged;
  const scopedBooking = !!bookingId?.trim();

  const runBackfill = (dryRun: boolean) => {
    const input: GmailApprovalBackfillInput = { dryRun };
    if (scopedBooking) {
      input.bookingId = bookingId!.trim();
      input.limitBookings = 1;
    }

    backfill.mutate(input, {
      onSuccess: (r) => {
        toast.success(
          buildBackfillToastSummary(r, scopedBooking) || 'Backfill finished',
        );
        closedAfterSuccessRef.current = true;
        onOpenChange(false);
        resetBackfillModal();
        onRunSuccess?.();
      },
      onError: (e) => {
        if (gmailReconnect?.handleGmailError(e)) return;
        toast.error(friendlyToastError(e, 'Backfill failed'));
      },
    });
  };

  const onBackfillConfirm = () => {
    if (backfillMode === 'apply' && !applyAcknowledged) return;
    runBackfill(backfillMode === 'preview');
  };

  const description =
    variant === 'booking-detail' ? (
      <>
        Pre-{HISTORICAL_BACKFILL_LISTENER_CUTOFF} booking awaits GAF approval.
        Search Gmail for missed approvals. Preview first, then apply.
      </>
    ) : (
      <>
        Search Gmail for older Azure approvals not linked to bookings. Preview
        first—no changes.
      </>
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (!closedAfterSuccessRef.current) onDismiss?.();
          closedAfterSuccessRef.current = false;
        }
        onOpenChange(next);
        if (next) resetBackfillModal();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historical approval backfill</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
                    Dry run: shows matches. No uploads or workflow changes.
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
                    Uploads PDFs and may advance workflow per backfill rules.
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
            onClick={() => {
              onDismiss?.();
              onOpenChange(false);
            }}
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
  );
}
