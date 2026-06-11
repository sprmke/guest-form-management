import { format } from 'date-fns';
import { CalendarCheck } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  selectedDay: Date | null;
  count: number;
  entityLabel: string;
  emptySelectTitle?: string;
  emptySelectCaption?: string;
  emptyDayTitle?: string;
  emptyDayCaption?: string;
  children: ReactNode;
};

export function CalendarDayDetailPanel({
  selectedDay,
  count,
  entityLabel,
  emptySelectTitle = 'Select a day',
  emptySelectCaption = 'Click any day to see items scheduled that night',
  emptyDayTitle = 'No items',
  emptyDayCaption = 'Nothing is scheduled for this night',
  children,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm bg-card border-border/50 dark:shadow-none">
      <div className="px-4 py-3 border-b border-separator bg-muted/30">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          {selectedDay
            ? format(selectedDay, 'EEEE, MMMM d, yyyy')
            : 'Day details'}
        </h3>
        {selectedDay && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {count === 0
              ? `No ${entityLabel} on this day`
              : `${count} ${entityLabel}${count === 1 ? '' : 's'}`}
          </p>
        )}
      </div>

      <div className="p-3">
        {!selectedDay ? (
          <CalendarEmptyDetail title={emptySelectTitle} caption={emptySelectCaption} />
        ) : count === 0 ? (
          <CalendarEmptyDetail title={emptyDayTitle} caption={emptyDayCaption} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function CalendarEmptyDetail({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <div className="flex flex-col gap-2 justify-center items-center py-10 text-center">
      <CalendarCheck className="size-9 text-muted-foreground/40" aria-hidden />
      <div>
        <p className="text-[13px] font-semibold text-muted-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}
