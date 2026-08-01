import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  CALENDAR_WEEKDAYS,
  buildCalendarWeekRows,
  buildOccupancySegmentsForWeeks,
  buildRangeCalendarDays,
  calendarPaddingStart,
  type CalendarVisibleRange,
  type OccupancySegment,
} from '@/features/dashboard/bookings/components/calendar/calendarDateUtils';
import { CalendarOccupancySpanTrack } from '@/features/dashboard/bookings/components/calendar/CalendarOccupancySpanTrack';
import { statusToneStyle } from '@/features/dashboard/bookings/components/StatusBadge';

import { cn } from '@/lib/utils';

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
  /** When set, render this range instead of a navigable month. */
  visibleRange?: CalendarVisibleRange;
  /** Hide month title + prev/today/next (dashboard uses global date filter). */
  hideNavigation?: boolean;
  /** Compact cells with pills on all breakpoints; for dashboard embeds. */
  compact?: boolean;
  /** Drop outer card chrome when nested inside a parent surface. */
  embedded?: boolean;
  /** When set, day clicks navigate instead of selecting a sidebar day. */
  onDayClick?: (day: Date, items: T[]) => void;
  onItemClick?: (item: T) => void;
  /** Multi-night stays: one bar per row instead of per-cell pills. */
  occupancyRows?: T[];
  getCheckIn?: (item: T) => string | null | undefined;
  getCheckOut?: (item: T) => string | null | undefined;
  renderOccupancySegment?: (segment: OccupancySegment<T>) => ReactNode;
  maxSpanLanes?: number;
  /** Optional control beside the month nav (e.g. Name/Price toggle). */
  navigationAccessory?: ReactNode;
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
  visibleRange,
  hideNavigation = false,
  compact = false,
  embedded = false,
  onDayClick,
  onItemClick,
  occupancyRows,
  getCheckIn,
  getCheckOut,
  renderOccupancySegment,
  maxSpanLanes,
  navigationAccessory,
}: Props<T>) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => initialMonth ?? new Date());

  useEffect(() => {
    if (visibleRange) return;
    if (initialMonth) setCurrentMonth(initialMonth);
  }, [initialMonth, visibleRange]);

  const rangeGrid = useMemo(() => {
    if (!visibleRange) return null;
    return buildRangeCalendarDays(visibleRange);
  }, [visibleRange]);

  const calendarGrid = useMemo(() => {
    if (rangeGrid) return rangeGrid;
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    return { days, paddingStart: calendarPaddingStart(start) };
  }, [currentMonth, rangeGrid]);

  const spanMode = Boolean(occupancyRows && getCheckIn && getCheckOut && renderOccupancySegment);

  const weeks = useMemo(
    () => buildCalendarWeekRows(calendarGrid.days, calendarGrid.paddingStart),
    [calendarGrid.days, calendarGrid.paddingStart]
  );

  const segmentsByWeek = useMemo(() => {
    if (!spanMode || !occupancyRows || !getCheckIn || !getCheckOut) return null;
    return buildOccupancySegmentsForWeeks(occupancyRows, weeks, getCheckIn, getCheckOut);
  }, [spanMode, occupancyRows, getCheckIn, getCheckOut, weeks]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (visibleRange) return;
    setCurrentMonth((cur) => {
      const next = direction === 'prev' ? subMonths(cur, 1) : addMonths(cur, 1);
      onMonthChange?.(next);
      return next;
    });
    onSelectedDayChange(null);
  };

  const dayCount = calendarGrid.days.length;
  const dense = compact && dayCount > 31;
  const cellMinHeight = dense ? 'sm:min-h-[48px]' : compact ? 'sm:min-h-[72px]' : 'sm:min-h-[88px]';
  const padCellMinHeight = cellMinHeight;
  /** Full calendar: pills on sm+; compact embed: pills unless range is dense (year-style). */
  const showPillLabels = !compact || !dense;
  const showWeekdayHeaders = true;
  const spanLaneCap = maxSpanLanes ?? (compact ? 1 : 2);

  const renderDayCell = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    const dayItems = itemsByDay.get(key) ?? [];
    const isSelected = !onDayClick && selectedDay && isSameDay(day, selectedDay);
    const isCurrentMonth = visibleRange ? true : isSameMonth(day, currentMonth);
    const hasItems = dayItems.length > 0;
    const todayFlag = isToday(day);
    const navigable = Boolean(onDayClick && hasItems);

    return (
      <button
        key={key}
        type="button"
        onClick={() => {
          if (onDayClick) {
            if (hasItems) onDayClick(day, dayItems);
            return;
          }
          onSelectedDayChange(isSelected ? null : day);
        }}
        disabled={onDayClick ? !hasItems : false}
        aria-label={`${format(day, 'MMMM d, yyyy')} – ${
          hasItems
            ? `${dayItems.length} ${entityLabel}${dayItems.length === 1 ? '' : 's'}`
            : `no ${entityLabel}s`
        }`}
        className={cn(
          'relative flex flex-col items-stretch justify-start rounded-lg p-1.5 transition-all duration-100',
          'aspect-square outline-none sm:aspect-auto',
          cellMinHeight,
          navigable &&
            'hover:bg-muted/50 focus-visible:ring-sidebar-primary/40 cursor-pointer focus-visible:ring-2',
          !navigable &&
            !onDayClick &&
            'hover:bg-muted/50 focus-visible:ring-sidebar-primary/40 focus-visible:ring-2',
          onDayClick && !hasItems && 'cursor-default',
          isSelected && 'ring-sidebar-primary/60 bg-sidebar-accent/30 ring-2',
          !isCurrentMonth && 'opacity-35'
        )}
      >
        <div className="flex min-h-[20px] items-center justify-between gap-1">
          <span
            className={cn(
              'text-[12px] font-semibold leading-none',
              todayFlag
                ? 'gradient-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full'
                : 'text-foreground px-1'
            )}
          >
            {format(day, 'd')}
          </span>
          {hasItems && (
            <span className="text-muted-foreground text-[9px] font-black tabular-nums">
              {dayItems.length}
            </span>
          )}
        </div>

        {hasItems && showPillLabels && !spanMode && (
          <div
            className={cn(
              'mt-1.5 flex flex-col gap-0.5 overflow-hidden',
              !compact && 'hidden sm:flex'
            )}
          >
            {dayItems.slice(0, compact ? 1 : 2).map((item) => (
              <div
                key={getItemKey(item)}
                onClick={
                  onItemClick
                    ? (event) => {
                        event.stopPropagation();
                        onItemClick(item);
                      }
                    : undefined
                }
                onKeyDown={
                  onItemClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          onItemClick(item);
                        }
                      }
                    : undefined
                }
                role={onItemClick ? 'link' : undefined}
                tabIndex={onItemClick ? 0 : undefined}
                className={cn(onItemClick && 'cursor-pointer rounded-md')}
              >
                {renderPill(item)}
              </div>
            ))}
            {dayItems.length > (compact ? 1 : 2) && (
              <span className="text-muted-foreground mt-0.5 px-1 text-[9px] font-bold">
                +{dayItems.length - (compact ? 1 : 2)} more
              </span>
            )}
          </div>
        )}

        {hasItems && getItemStatus && (compact ? dense : true) && (
          <div
            className={cn(
              'mt-auto flex justify-center gap-0.5 pb-0.5',
              spanMode && !compact && 'sm:hidden',
              !spanMode && !compact && 'sm:hidden',
              !spanMode && compact && !dense && 'hidden'
            )}
          >
            {dayItems.slice(0, 4).map((item) => {
              const tone = statusToneStyle(getItemStatus(item));
              return (
                <span
                  key={getItemKey(item)}
                  aria-hidden
                  className={cn('size-1.5 shrink-0 rounded-full', tone.dot)}
                />
              );
            })}
          </div>
        )}
      </button>
    );
  };

  return (
    <div
      className={cn(
        'overflow-hidden',
        !embedded &&
          'bg-card border-border/50 rounded-xl border shadow-sm lg:col-span-2 dark:shadow-none'
      )}
    >
      {!hideNavigation ? (
        <div className="border-separator bg-muted/30 flex items-center justify-between border-b px-3 py-3 sm:px-4">
          <h2 className="text-foreground text-[14px] font-bold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-4">
            {navigationAccessory}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                aria-label="Previous month"
                className={cn(
                  'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg',
                  'bg-card text-sidebar-muted border-sidebar-border border',
                  'hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
                  'transition-all duration-100'
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
                  'inline-flex min-h-[36px] items-center justify-center rounded-lg px-2.5 text-[12px] font-semibold',
                  'bg-card text-sidebar-muted border-sidebar-border border',
                  'hover:border-sidebar-primary/40 hover:bg-sidebar-accent/50 transition-all duration-100'
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                aria-label="Next month"
                className={cn(
                  'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg',
                  'bg-card text-sidebar-muted border-sidebar-border border',
                  'hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
                  'transition-all duration-100'
                )}
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showWeekdayHeaders ? (
        <div className="grid grid-cols-7 px-2 pb-1 pt-3 sm:px-3">
          {CALENDAR_WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-muted-foreground py-1 text-center text-[10px] font-bold uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>
      ) : null}

      {spanMode ? (
        <div className="flex flex-col gap-1 px-2 pb-3 sm:px-3">
          {weeks.map((week) => (
            <div key={week.weekIndex}>
              <div className="grid grid-cols-7 gap-1">
                {week.days.map((day, colIdx) =>
                  day ? (
                    renderDayCell(day)
                  ) : (
                    <div
                      key={`pad-${week.weekIndex}-${colIdx}`}
                      className={cn('aspect-square', padCellMinHeight)}
                    />
                  )
                )}
              </div>
              {renderOccupancySegment ? (
                <CalendarOccupancySpanTrack
                  segments={segmentsByWeek?.get(week.weekIndex) ?? []}
                  getSegmentKey={(segment) =>
                    `${week.weekIndex}-${getItemKey(segment.item)}-${segment.startCol}-${segment.endCol}`
                  }
                  renderSegment={renderOccupancySegment}
                  maxLanes={spanLaneCap}
                  hiddenClassName={cn(!compact && 'hidden sm:grid', compact && dense && 'hidden')}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 px-2 pb-3 sm:px-3">
          {Array.from({ length: calendarGrid.paddingStart }).map((_, idx) => (
            <div key={`pad-${idx}`} className={cn('aspect-square', padCellMinHeight)} />
          ))}

          {calendarGrid.days.map((day) => renderDayCell(day))}
        </div>
      )}
    </div>
  );
}
