import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusToneStyle } from '@/features/admin/components/StatusBadge';
import { CALENDAR_WEEKDAYS } from '@/features/admin/components/calendar/calendarDateUtils';

type Props<T> = {
  itemsByDay: Map<string, T[]>;
  getItemKey: (item: T) => string;
  getItemStatus?: (item: T) => string;
  renderPill: (item: T) => ReactNode;
  entityLabel: string;
  initialMonth?: Date;
  onMonthChange?: (month: Date) => void;
  selectedDay: Date | null;
  onSelectedDayChange: (day: Date | null) => void;
};

export function CalendarMonthGrid<T>({
  itemsByDay,
  getItemKey,
  getItemStatus,
  renderPill,
  entityLabel,
  initialMonth,
  onMonthChange,
  selectedDay,
  onSelectedDayChange,
}: Props<T>) {
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => initialMonth ?? new Date(),
  );

  useEffect(() => {
    if (initialMonth) setCurrentMonth(initialMonth);
  }, [initialMonth]);

  const calendarGrid = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDay = getDay(start);
    return { days, paddingStart: startDay };
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((cur) => {
      const next = direction === 'prev' ? subMonths(cur, 1) : addMonths(cur, 1);
      onMonthChange?.(next);
      return next;
    });
    onSelectedDayChange(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm bg-card lg:col-span-2 border-border/50 dark:shadow-none">
      <div className="flex justify-between items-center px-3 py-3 border-b border-separator bg-muted/30 sm:px-4">
        <h2 className="text-[14px] font-bold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1 items-center">
          <button
            type="button"
            onClick={() => navigateMonth('prev')}
            aria-label="Previous month"
            className={cn(
              'inline-flex justify-center items-center rounded-lg min-w-[36px] min-h-[36px]',
              'border bg-card text-sidebar-muted border-sidebar-border',
              'hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
              'transition-all duration-100',
            )}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today);
              onMonthChange?.(today);
              onSelectedDayChange(null);
            }}
            className={cn(
              'inline-flex items-center justify-center rounded-lg px-2.5 min-h-[36px] text-[12px] font-semibold',
              'border bg-card text-sidebar-muted border-sidebar-border',
              'hover:border-sidebar-primary/40 hover:bg-sidebar-accent/50 transition-all duration-100',
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigateMonth('next')}
            aria-label="Next month"
            className={cn(
              'inline-flex justify-center items-center rounded-lg min-w-[36px] min-h-[36px]',
              'border bg-card text-sidebar-muted border-sidebar-border',
              'hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
              'transition-all duration-100',
            )}
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 px-2 pt-3 pb-1 sm:px-3">
        {CALENDAR_WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-2 pb-3 sm:px-3">
        {Array.from({ length: calendarGrid.paddingStart }).map((_, idx) => (
          <div key={`pad-${idx}`} className="aspect-square sm:min-h-[88px]" />
        ))}

        {calendarGrid.days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayItems = itemsByDay.get(key) ?? [];
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const hasItems = dayItems.length > 0;
          const todayFlag = isToday(day);

          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                onSelectedDayChange(isSelected ? null : day)
              }
              aria-label={`${format(day, 'MMMM d, yyyy')} – ${
                hasItems
                  ? `${dayItems.length} ${entityLabel}${dayItems.length === 1 ? '' : 's'}`
                  : `no ${entityLabel}s`
              }`}
              className={cn(
                'relative flex flex-col items-stretch justify-start rounded-lg p-1.5 transition-all duration-100',
                'aspect-square sm:aspect-auto sm:min-h-[88px] outline-none',
                'hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
                isSelected && 'ring-2 ring-sidebar-primary/60 bg-sidebar-accent/30',
                !isCurrentMonth && 'opacity-35',
              )}
            >
              <div className="flex items-center justify-between gap-1 min-h-[20px]">
                <span
                  className={cn(
                    'font-semibold leading-none text-[12px]',
                    todayFlag
                      ? 'inline-flex justify-center items-center rounded-full size-5 bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'px-1 text-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {hasItems && (
                  <span className="text-[9px] font-black tabular-nums text-muted-foreground">
                    {dayItems.length}
                  </span>
                )}
              </div>

              {hasItems && (
                <div className="hidden sm:flex flex-col gap-0.5 mt-1.5 overflow-hidden">
                  {dayItems.slice(0, 2).map((item) => (
                    <div key={getItemKey(item)}>{renderPill(item)}</div>
                  ))}
                  {dayItems.length > 2 && (
                    <span className="text-[9px] font-bold text-muted-foreground px-1 mt-0.5">
                      +{dayItems.length - 2} more
                    </span>
                  )}
                </div>
              )}

              {hasItems && getItemStatus && (
                <div className="sm:hidden mt-auto flex justify-center gap-0.5 pb-0.5">
                  {dayItems.slice(0, 4).map((item) => {
                    const tone = statusToneStyle(getItemStatus(item));
                    return (
                      <span
                        key={getItemKey(item)}
                        aria-hidden
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          tone.dot,
                        )}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
