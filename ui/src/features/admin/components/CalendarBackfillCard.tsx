import { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCalendarBackfill } from '@/features/admin/hooks/useCalendarBackfill';

export function CalendarBackfillCard() {
  const backfill = useCalendarBackfill();
  const [onlyCompleted, setOnlyCompleted] = useState(true);
  const [bookingId, setBookingId] = useState('');

  const run = (dryRun: boolean) => {
    const ids = bookingId.trim() ? [bookingId.trim()] : undefined;
    backfill.mutate(
      {
        dryRun,
        onlyCompleted: ids ? false : onlyCompleted,
        bookingIds: ids,
        limit: ids ? 1 : 300,
      },
      {
        onSuccess: (data) => {
          const s = data.summary;
          if (dryRun) {
            toast.message(
              `Preview: ${s.wouldPatch ?? 0} would update, ${s.notFound ?? 0} no event found (scanned ${data.scanned}).`,
            );
          } else {
            toast.success(
              `Updated ${s.patched ?? 0} event(s), created ${s.created ?? 0}, not found ${s.notFound ?? 0}, failed ${s.failed ?? 0}.`,
            );
          }
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Calendar backfill failed');
        },
      },
    );
  };

  const busy = backfill.isPending;

  return (
    <section
      className={cn(
        'w-full rounded-xl border border-sidebar-border bg-card px-3 py-3 sm:px-4 sm:py-3.5',
        'shadow-sm',
      )}
      aria-labelledby="calendar-backfill-heading"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="shrink-0 flex size-10 sm:size-11 items-center justify-center rounded-lg bg-blue-500/15 text-blue-700">
          <Calendar className="size-5 sm:size-[22px]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2
              id="calendar-backfill-heading"
              className="text-sm font-bold text-sidebar-foreground sm:text-[13px]"
            >
              Google Calendar repair
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 sm:text-[11px] leading-snug">
              Re-sync calendar events from the database: fixes check-in at 2:00 PM
              showing as 2:00 AM, and titles stuck on Ready for check-in when the
              booking is already Completed.
            </p>
          </div>

          <label className="flex items-center gap-2 min-h-[44px] text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyCompleted}
              disabled={busy || !!bookingId.trim()}
              onChange={(e) => setOnlyCompleted(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            Only Completed bookings (status drift)
          </label>

          <div className="space-y-1">
            <label
              htmlFor="calendar-backfill-booking-id"
              className="text-[11px] font-medium text-slate-500"
            >
              Single booking ID (optional)
            </label>
            <input
              id="calendar-backfill-booking-id"
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. 3a8bdafd-9b50-4520-8bc1-10a5acaabcc9"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(true)}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Preview (dry run)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    'Update Google Calendar events from the database? Run Preview first if unsure.',
                  )
                ) {
                  return;
                }
                run(false);
              }}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Apply calendar fixes
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
