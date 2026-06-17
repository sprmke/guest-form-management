import * as React from 'react';
import { ScanSearch, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { calendarDatesBackfillToast, friendlyToastError } from '@/lib/toastMessages';
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
  useCalendarEventDatesBackfill,
  type CalendarEventDatesBackfillResult,
} from '@/features/admin/hooks/useCalendarEventDatesBackfill';

type BackfillModalMode = 'preview' | 'apply';

const DEFAULT_BATCH_LIMIT = 200;

export type CalendarEventDatesBackfillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function buildToastSummary(r: CalendarEventDatesBackfillResult): string {
  return calendarDatesBackfillToast(r);
}

export function CalendarEventDatesBackfillDialog({
  open,
  onOpenChange,
}: CalendarEventDatesBackfillDialogProps) {
  const backfill = useCalendarEventDatesBackfill();
  const closedAfterSuccessRef = React.useRef(false);
  const [mode, setMode] = React.useState<BackfillModalMode>('preview');
  const [applyAcknowledged, setApplyAcknowledged] = React.useState(false);
  const [lastPreview, setLastPreview] =
    React.useState<CalendarEventDatesBackfillResult | null>(null);

  const resetModal = React.useCallback(() => {
    setMode('preview');
    setApplyAcknowledged(false);
    setLastPreview(null);
  }, []);

  const busy = backfill.isPending;
  const canRunApply = mode === 'apply' && applyAcknowledged;

  const runBackfill = (dryRun: boolean) => {
    backfill.mutate(
      {
        dryRun,
        limit: DEFAULT_BATCH_LIMIT,
        futureStaysOnly: false,
      },
      {
        onSuccess: (r) => {
          if (r.dryRun) {
            setLastPreview(r);
          }
          toast.success(buildToastSummary(r) || 'Finished');
          if (!dryRun) {
            closedAfterSuccessRef.current = true;
            onOpenChange(false);
            resetModal();
          }
        },
        onError: (e) => toast.error(friendlyToastError(e, 'Calendar update failed')),
      },
    );
  };

  const onConfirm = () => {
    if (mode === 'apply' && !applyAcknowledged) return;
    runBackfill(mode === 'preview');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !closedAfterSuccessRef.current) {
          resetModal();
        }
        closedAfterSuccessRef.current = false;
        onOpenChange(next);
        if (next) resetModal();
      }}
    >
      <DialogContent className="max-h-[min(90dvh,36rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fix Google Calendar stay dates</DialogTitle>
          <DialogDescription>
            Re-sync calendar end times for 2+ night stays. Preview first, then
            apply.
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
                setMode('preview');
                setApplyAcknowledged(false);
              }}
              className={cn(
                'rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2',
                mode === 'preview'
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
                    Dry run: lists multi-night stays needing new calendar end
                    times. No Google changes.
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('apply')}
              className={cn(
                'rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2',
                mode === 'apply'
                  ? 'border-sidebar-primary bg-sidebar-primary/10 ring-2 ring-sidebar-primary/30'
                  : 'border-sidebar-border hover:bg-sidebar-accent/30',
                'disabled:pointer-events-none disabled:opacity-40',
              )}
            >
              <span className="flex items-start gap-2">
                <Zap
                  className="mt-0.5 size-5 shrink-0 text-sidebar-primary"
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-sidebar-foreground sm:text-[13px]">
                    Apply for real
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground sm:text-[11px] leading-snug">
                    PATCHes Google Calendar start/end and removes duplicate
                    events per booking.
                  </span>
                </span>
              </span>
            </button>
          </div>
        </fieldset>

        {mode === 'apply' && (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3">
            <div className="flex gap-3 min-h-[44px] items-start">
              <input
                id="calendar-backfill-apply-ack"
                type="checkbox"
                checked={applyAcknowledged}
                onChange={(e) => setApplyAcknowledged(e.target.checked)}
                className={cn(
                  'mt-1 size-5 shrink-0 rounded border-sidebar-border',
                  'text-sidebar-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2',
                )}
              />
              <Label
                htmlFor="calendar-backfill-apply-ack"
                className="text-xs font-normal leading-snug text-sidebar-foreground sm:text-[11px] cursor-pointer"
              >
                I ran preview or accept that this updates Google Calendar for
                listed stays.
              </Label>
            </div>
          </div>
        )}

        {lastPreview ? (
          <div className="rounded-lg border border-separator bg-muted/20 px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {lastPreview.count === 0
                ? 'Nothing to fix'
                : `Preview: ${lastPreview.count ?? lastPreview.preview?.length ?? 0} multi-night stay(s)`}
            </p>
            {lastPreview.message ? (
              <p className="text-xs text-muted-foreground leading-snug">
                {lastPreview.message}
              </p>
            ) : null}
            {lastPreview.preview && lastPreview.preview.length > 0 ? (
            <div className="max-h-40 overflow-y-auto overscroll-contain text-xs text-muted-foreground space-y-1">
              {lastPreview.preview.slice(0, 8).map((row) => (
                <p key={row.bookingId} className="font-mono text-[11px] leading-snug">
                  {row.checkIn} → {row.checkOut} ({row.nights}n) · end{' '}
                  {row.newEndDateTime.replace('T', ' ')}
                </p>
              ))}
              {(lastPreview.preview.length ?? 0) > 8 ? (
                <p className="text-[11px] italic">
                  +{(lastPreview.preview.length ?? 0) - 8} more
                </p>
              ) : null}
            </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full sm:w-auto border-sidebar-border"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-[44px] w-full sm:w-auto"
            disabled={busy || (mode === 'apply' && !canRunApply)}
            onClick={onConfirm}
          >
            {busy
              ? 'Running…'
              : mode === 'preview'
                ? 'Run preview'
                : 'Fix calendar dates'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
