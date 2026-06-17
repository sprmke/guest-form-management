import * as React from 'react';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarEventDatesBackfillDialog } from '@/features/admin/components/CalendarEventDatesBackfillDialog';

type Props = {
  /** When false, Google Calendar env is not configured. */
  calendarConfigured: boolean;
};

export function CalendarEventDatesBackfillCard({ calendarConfigured }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      <CalendarEventDatesBackfillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-muted/20 px-3 py-3">
        <div className="flex gap-3 items-start min-w-0">
          <div
            className={cn(
              'flex justify-center items-center rounded-lg shrink-0 size-10 sm:size-11',
              calendarConfigured
                ? 'text-sky-700 bg-sky-500/15'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <CalendarRange className="size-5 sm:size-[22px]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-sidebar-foreground sm:text-[13px]">
              Google Calendar stay dates
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 sm:text-[11px] leading-snug">
              Fix multi-night stays that show an extra calendar day. Calendar only.
            </p>
            {!calendarConfigured ? (
              <p className="text-xs text-amber-800/90 mt-1.5 sm:text-[11px] dark:text-amber-200">
                Configure Google Calendar credentials before running this tool.
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={!calendarConfigured}
          onClick={() => setDialogOpen(true)}
          title={
            calendarConfigured
              ? 'Re-sync calendar event dates for existing bookings'
              : 'Google Calendar is not configured'
          }
          className={cn(
            'inline-flex gap-2 justify-center items-center px-3 rounded-lg min-h-[44px] sm:px-4',
            'text-sm font-semibold border border-sidebar-border bg-background sm:text-[13px]',
            'transition-colors hover:bg-sidebar-accent/40',
            'w-full disabled:opacity-40 disabled:pointer-events-none sm:w-auto sm:shrink-0',
          )}
        >
          <CalendarRange className="size-4 shrink-0" aria-hidden />
          Fix calendar dates
        </button>
      </div>
    </>
  );
}
