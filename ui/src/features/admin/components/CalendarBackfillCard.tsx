import { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCalendarBackfill } from '@/features/admin/hooks/useCalendarBackfill';

export function CalendarBackfillCard() {
  const backfill = useCalendarBackfill();
  const [onlyCompleted, setOnlyCompleted] = useState(false);
  const [bookingId, setBookingId] = useState('');

  const run = (dryRun: boolean) => {
    const id = bookingId.trim();
    backfill.mutate(
      {
        dryRun,
        onlyCompleted: id ? false : onlyCompleted,
        bookingIds: id ? [id] : undefined,
      },
      {
        onSuccess: (data) => {
          const s = data.summary;
          if (dryRun) {
            toast.message(
              `Preview: ${s.needsRepair ?? 0} need repair, ${s.alreadyOk ?? 0} OK, ${s.notFound ?? 0} missing (${s.scanned} scanned).`,
            );
          } else {
            toast.success(
              `Done: ${s.synced ?? 0} repaired, ${s.skippedOk ?? 0} already OK, ${s.notFound ?? 0} missing, ${s.failed ?? 0} failed.`,
            );
          }
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
      },
    );
  };

  return (
    <section className="rounded-xl border border-sidebar-border bg-card px-3 py-3 sm:px-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-700">
          <Calendar className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-sm font-bold">Calendar &amp; sheet repair</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stays with check-in on or after May 12, 2026. Preview flags wrong times (e.g. 2am vs 2pm) or stale titles; Apply fixes only rows that need repair.
            </p>
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={onlyCompleted}
              disabled={backfill.isPending || !!bookingId.trim()}
              onChange={(e) => setOnlyCompleted(e.target.checked)}
              className="size-4"
            />
            Completed bookings only
          </label>
          <input
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="Booking ID (optional)"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <button
              type="button"
              disabled={backfill.isPending}
              onClick={() => run(true)}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium disabled:opacity-50"
            >
              {backfill.isPending ? <Loader2 className="mx-auto size-4 animate-spin" /> : 'Preview'}
            </button>
            <button
              type="button"
              disabled={backfill.isPending}
              onClick={() => {
                if (!window.confirm('Sync calendar and sheet from DB for matched bookings?')) return;
                run(false);
              }}
              className="min-h-[44px] flex-1 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-800 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
