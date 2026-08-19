import { useMemo, type ReactNode } from 'react';

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfToday,
  getDay,
} from 'date-fns';
import { Ban, CalendarDays, ChevronLeft, ChevronRight, PenLine, Sparkles } from 'lucide-react';

import {
  buildCalendarWeekRows,
  buildOccupancyByDay,
  buildOccupancySegmentsForWeeks,
  calendarOccupancySpanPosition,
  parseOccupancyDate,
} from '@/features/dashboard/bookings/components/calendar/calendarDateUtils';
import { bookingListDisplayName } from '@/features/dashboard/bookings/lib/bookingListDisplay';
import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';
import { PricingCalendarBookingPill } from '@/features/dashboard/pricing/components/PricingCalendarBookingPill';
import { PricingCalendarSpanOverlay } from '@/features/dashboard/pricing/components/PricingCalendarSpanOverlay';
import type { PricingHolidayRule } from '@/features/dashboard/pricing/lib/phHolidayRules';
import { dateKey } from '@/features/dashboard/pricing/lib/pricingCalendarUtils';
import type { PropertyPricingCalendarBooking } from '@/features/dashboard/pricing/lib/propertyPricingApi';

import { AdminSurfaceCardHeader } from '@/components/shared/AdminSurfaceCardHeader';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/utils/format/currency';
import { formatStayDateRange } from '@/utils/format/dates';

export type PricingDayState = {
  price: number;
  rule?: PricingHolidayRule;
  isCustom: boolean;
  isBooked: boolean;
  isBlocked: boolean;
};

type Props = {
  currentMonth: Date;
  selectedDates: Date[];
  bookings: PropertyPricingCalendarBooking[];
  onMonthChange: (month: Date) => void;
  onDateClick: (date: Date) => void;
  onDateMouseDown: (date: Date) => void;
  onDateMouseEnter: (date: Date) => void;
  onSelectionEnd: () => void;
  onBookingClick: (booking: PropertyPricingCalendarBooking) => void;
  getPriceForDate: (date: Date) => PricingDayState;
  getBookingStayTotal?: (booking: PropertyPricingCalendarBooking) => number | null;
};

function bookingPillLabel(booking: PropertyPricingCalendarBooking): string {
  return (
    booking.primary_guest_name?.split(' ')[0] ||
    booking.guest_facebook_name?.split(' ')[0] ||
    'Guest'
  );
}

function defaultBookingStayTotal(booking: PropertyPricingCalendarBooking): number | null {
  if (booking.booking_rate == null) return null;
  return Number.isFinite(booking.booking_rate) ? booking.booking_rate : null;
}

function isCancelledCalendarBooking(status: string): boolean {
  return status === 'CANCELLED' || status === 'canceled';
}

function comparePricingCalendarLanes(
  a: PropertyPricingCalendarBooking,
  b: PropertyPricingCalendarBooking
): number {
  const byCancelled =
    Number(isCancelledCalendarBooking(a.status)) - Number(isCancelledCalendarBooking(b.status));
  if (byCancelled !== 0) return byCancelled;
  const aIn = parseOccupancyDate(a.check_in_date)?.getTime() ?? 0;
  const bIn = parseOccupancyDate(b.check_in_date)?.getTime() ?? 0;
  return aIn - bIn || a.id.localeCompare(b.id);
}

export function PricingCalendarGrid({
  currentMonth,
  selectedDates,
  bookings,
  onMonthChange,
  onDateClick,
  onDateMouseDown,
  onDateMouseEnter,
  onSelectionEnd,
  onBookingClick,
  getPriceForDate,
  getBookingStayTotal = defaultBookingStayTotal,
}: Props) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const weeks = useMemo(
    () => buildCalendarWeekRows(daysInMonth, startPadding),
    [daysInMonth, startPadding]
  );

  const segmentsByWeek = useMemo(
    () =>
      buildOccupancySegmentsForWeeks(
        bookings,
        weeks,
        (row) => row.check_in_date,
        (row) => row.check_out_date,
        comparePricingCalendarLanes
      ),
    [bookings, weeks]
  );

  const bookingsByDay = useMemo(
    () =>
      buildOccupancyByDay(
        bookings,
        (row) => row.check_in_date,
        (row) => row.check_out_date
      ),
    [bookings]
  );

  return (
    <section className="surface-card min-w-0 p-4 sm:p-5">
      <AdminSurfaceCardHeader
        icon={CalendarDays}
        title="Rates & availability"
        description="Manage pricing and availability"
        iconClassName="bg-muted/80"
        action={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              aria-label="Previous month"
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[9.5rem] text-center text-sm font-semibold tabular-nums sm:text-base">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              aria-label="Next month"
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <TooltipProvider delayDuration={200}>
        <div
          className="select-none"
          onMouseUp={onSelectionEnd}
          onMouseLeave={onSelectionEnd}
          onTouchEnd={onSelectionEnd}
        >
          <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-muted-foreground py-1 text-center text-xs font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 sm:gap-2">
            {weeks.map((week) => (
              <div key={week.weekIndex} className="relative">
                <div className="relative z-0 grid grid-cols-7 gap-1.5 sm:gap-2">
                  {week.days.map((day, colIdx) =>
                    day ? (
                      <PricingDayCell
                        key={day.toISOString()}
                        day={day}
                        selectedDates={selectedDates}
                        dayBookings={[...(bookingsByDay.get(dateKey(day)) ?? [])].sort(
                          comparePricingCalendarLanes
                        )}
                        getPriceForDate={getPriceForDate}
                        onDateClick={onDateClick}
                        onDateMouseDown={onDateMouseDown}
                        onDateMouseEnter={onDateMouseEnter}
                        onBookingClick={onBookingClick}
                      />
                    ) : (
                      <div
                        key={`pad-${week.weekIndex}-${colIdx}`}
                        className="aspect-square min-h-[4.5rem]"
                        aria-hidden
                      />
                    )
                  )}
                </div>

                <PricingCalendarSpanOverlay
                  segments={segmentsByWeek.get(week.weekIndex) ?? []}
                  getSegmentKey={(segment) =>
                    `${week.weekIndex}-${segment.item.id}-${segment.startCol}-${segment.endCol}`
                  }
                  maxLanes={3}
                  renderSegment={(segment) => {
                    const booking = segment.item;
                    const guestName = bookingListDisplayName(booking);
                    const stayRange =
                      formatStayDateRange(booking.check_in_date, booking.check_out_date) ?? '';
                    const stayTotal = getBookingStayTotal(booking);
                    const segmentIsPast = week.days
                      .slice(segment.startCol, segment.endCol + 1)
                      .every((day) => !day || isBefore(day, startOfToday()));

                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'group pointer-events-auto h-full w-full min-w-0 cursor-pointer text-left',
                              'focus-visible:ring-primary/50 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                              'motion-safe:transition-opacity motion-safe:duration-150',
                              segmentIsPast && 'opacity-55'
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              onBookingClick(booking);
                            }}
                            aria-label={
                              stayRange
                                ? `Open booking for ${guestName}, ${stayRange}`
                                : `Open booking for ${guestName}`
                            }
                          >
                            <PricingCalendarBookingPill
                              status={booking.status}
                              label={bookingPillLabel(booking)}
                              guestName={guestName}
                              validIdUrl={booking.valid_id_url}
                              showLabel={segment.showLabel}
                              spanPosition={calendarOccupancySpanPosition(segment)}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="px-3 py-2.5">
                          <PricingCalendarStayTooltip booking={booking} total={stayTotal} />
                        </TooltipContent>
                      </Tooltip>
                    );
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      <div
        className="text-muted-foreground border-border/60 mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-3 text-xs"
        role="list"
        aria-label="Calendar legend"
      >
        <LegendSwatch className="bg-card ring-border ring-1" label="Available" />
        <LegendIcon label="Holiday">
          <Sparkles className="text-primary size-3" aria-hidden />
        </LegendIcon>
        <LegendIcon label="Custom">
          <PenLine className="size-3 text-amber-600 dark:text-amber-400" aria-hidden />
        </LegendIcon>
        <LegendPill label="Booked" />
        <LegendIcon label="Blocked">
          <Ban className="text-muted-foreground size-3" aria-hidden />
        </LegendIcon>
        <LegendSwatch className="ring-primary ring-1" label="Selected" />
      </div>
    </section>
  );
}

function PricingDayCell({
  day,
  selectedDates,
  dayBookings,
  getPriceForDate,
  onDateClick,
  onDateMouseDown,
  onDateMouseEnter,
  onBookingClick,
}: {
  day: Date;
  selectedDates: Date[];
  dayBookings: PropertyPricingCalendarBooking[];
  getPriceForDate: (date: Date) => PricingDayState;
  onDateClick: (date: Date) => void;
  onDateMouseDown: (date: Date) => void;
  onDateMouseEnter: (date: Date) => void;
  onBookingClick: (booking: PropertyPricingCalendarBooking) => void;
}) {
  const { price, rule, isCustom, isBooked, isBlocked } = getPriceForDate(day);
  const isSelected = selectedDates.some((d) => isSameDay(d, day));
  const isPast = isBefore(day, startOfToday());
  const hasHoliday = rule != null;
  const isLocked = isPast || isBooked;
  const showPrice = !isBooked;
  const showMarkers = !isBooked && !isBlocked;
  const singleStay = isBooked && dayBookings.length === 1 ? dayBookings[0] : null;
  const overlappingStays = isBooked && dayBookings.length > 1;
  const hiddenBookings = isBooked && dayBookings.length > 3 ? dayBookings.slice(3) : [];
  const stayRange = singleStay
    ? formatStayDateRange(singleStay.check_in_date, singleStay.check_out_date)
    : null;

  return (
    <button
      type="button"
      className={cn(
        'border-border bg-card relative flex aspect-square min-h-[4.5rem] min-w-0 flex-col rounded-lg border p-1.5 text-left transition-colors sm:p-2',
        isPast && !isBooked && 'cursor-not-allowed opacity-45',
        isPast && isBooked && 'bg-muted/40',
        !isLocked && isBlocked && 'bg-muted border-muted-foreground/20',
        (isBooked || (!isLocked && !isBlocked)) &&
          'hover:border-primary/50 cursor-pointer hover:shadow-sm',
        isSelected &&
          !isLocked &&
          'border-primary bg-primary/10 ring-primary/30 opacity-100 ring-2',
        isToday(day) && !isSelected && !isPast && 'ring-primary/60 ring-1'
      )}
      onMouseDown={() => {
        if (!isBooked) onDateMouseDown(day);
      }}
      onMouseEnter={() => {
        if (!isBooked) onDateMouseEnter(day);
      }}
      onClick={() => {
        if (singleStay) {
          onBookingClick(singleStay);
          return;
        }
        if (overlappingStays) return;
        if (!isBooked) onDateClick(day);
      }}
      disabled={isPast && !isBooked}
      aria-pressed={isSelected}
      aria-label={
        overlappingStays
          ? `${format(day, 'MMMM d')}, ${dayBookings.length} stays`
          : singleStay
            ? `Open booking for ${bookingListDisplayName(singleStay)}${stayRange ? `, ${stayRange}` : ''}`
            : showPrice
              ? `${format(day, 'MMMM d')}, ${formatMoneyCompact(price)} per night${isBlocked ? ', blocked' : ''}${hasHoliday ? ', holiday' : ''}${isCustom ? ', custom rate' : ''}`
              : `${format(day, 'MMMM d')}${isPast ? ', past' : ''}${isBlocked ? ', blocked' : ''}`
      }
    >
      <span
        className={cn(
          'text-sm font-semibold leading-none',
          (isBlocked || isPast) && 'text-muted-foreground',
          !isBlocked && !isPast && isToday(day) && 'text-primary',
          !isBlocked && !isPast && !isToday(day) && 'text-foreground'
        )}
      >
        {format(day, 'd')}
      </span>

      {showPrice ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-muted/70 dark:bg-muted/50 mt-auto flex w-full items-center justify-center rounded-md px-0.5 py-1">
              <span
                className={cn(
                  'w-full truncate text-center text-[11px] font-semibold tabular-nums leading-none sm:text-xs',
                  (isPast || isBlocked) && 'text-muted-foreground',
                  !isPast && !isBlocked && 'text-foreground'
                )}
              >
                {formatMoneyCompact(price)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="px-3 py-2.5">
            <PricingDayTooltip
              day={day}
              price={price}
              showPrice={showPrice}
              isBlocked={isBlocked}
              isPast={isPast}
              rule={hasHoliday ? rule : undefined}
              isCustom={isCustom}
            />
          </TooltipContent>
        </Tooltip>
      ) : null}

      {hiddenBookings.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="bg-card/95 text-muted-foreground ring-border absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums leading-none ring-1"
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              +{hiddenBookings.length}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="end" className="px-3 py-2.5">
            <PricingCalendarOverflowTooltip bookings={hiddenBookings} />
          </TooltipContent>
        </Tooltip>
      ) : null}

      {isCustom && showMarkers ? (
        <PenLine
          className="absolute right-1 top-1 size-3 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
      ) : null}
      {hasHoliday && showMarkers ? (
        <Sparkles className="text-primary absolute right-1 top-1 size-3" aria-hidden />
      ) : null}
      {isBlocked && !isBooked ? (
        <Ban className="text-muted-foreground absolute right-1 top-1 size-3" aria-hidden />
      ) : null}
    </button>
  );
}

function PricingCalendarStayTooltip({
  booking,
  total,
}: {
  booking: PropertyPricingCalendarBooking;
  total: number | null;
}) {
  const range = formatStayDateRange(booking.check_in_date, booking.check_out_date);

  return (
    <div className="min-w-[9.5rem] space-y-1.5">
      <p className="text-foreground text-sm font-semibold leading-none">
        {bookingListDisplayName(booking)}
      </p>
      {range ? (
        <p className="text-muted-foreground text-xs font-medium leading-none">{range}</p>
      ) : null}
      {total != null ? (
        <p className="text-foreground text-base font-semibold tabular-nums leading-none">
          {formatMoneyCompact(total)}
        </p>
      ) : null}
      <div className="border-border/60 border-t pt-2">
        <span className="bg-muted/80 text-muted-foreground inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none">
          {statusLabel(booking.status)}
        </span>
      </div>
    </div>
  );
}

function PricingCalendarOverflowTooltip({
  bookings,
}: {
  bookings: PropertyPricingCalendarBooking[];
}) {
  return (
    <div className="min-w-[11rem] space-y-2">
      <p className="text-foreground text-xs font-semibold leading-none">
        {bookings.length} more booking{bookings.length === 1 ? '' : 's'}
      </p>
      <div className="space-y-1.5">
        {bookings.map((booking) => {
          const range = formatStayDateRange(booking.check_in_date, booking.check_out_date);

          return (
            <div
              key={booking.id}
              className="border-border/50 border-b pb-1.5 last:border-0 last:pb-0"
            >
              <p className="text-foreground text-xs font-medium leading-none">
                {bookingListDisplayName(booking)}
              </p>
              {range ? (
                <p className="text-muted-foreground mt-1 text-[11px] leading-none">{range}</p>
              ) : null}
              <p className="text-muted-foreground mt-1 text-[11px] leading-none">
                {statusLabel(booking.status)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PricingDayTooltip({
  day,
  price,
  showPrice,
  isBlocked,
  isPast,
  rule,
  isCustom,
}: {
  day: Date;
  price: number;
  showPrice: boolean;
  isBlocked: boolean;
  isPast: boolean;
  rule?: PricingHolidayRule;
  isCustom: boolean;
}) {
  const tags: string[] = [];
  if (isBlocked) tags.push('Blocked');
  else if (isPast) tags.push('Past');
  if (rule) tags.push(rule.name);
  if (isCustom) tags.push('Custom rate');

  return (
    <div className="min-w-[8.75rem] space-y-2">
      <p className="text-muted-foreground text-xs font-medium leading-none">
        {format(day, 'EEEE, MMM d')}
      </p>
      {showPrice ? (
        <p className="text-foreground text-base font-semibold tabular-nums leading-none">
          {formatMoneyCompact(price)}
          <span className="text-muted-foreground ml-1 text-xs font-normal">/ night</span>
        </p>
      ) : null}
      {tags.length > 0 ? (
        <div className="border-border/60 flex flex-wrap gap-1 border-t pt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-muted/80 text-muted-foreground inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LegendPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" role="listitem">
      <span className="bg-primary ring-primary/20 inline-flex h-2.5 min-w-[1rem] rounded-full shadow-sm ring-1" />
      {label}
    </span>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" role="listitem">
      <span className={cn('size-2.5 rounded-[3px]', className)} />
      {label}
    </span>
  );
}

function LegendIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5" role="listitem">
      <span className="flex size-4 items-center justify-center">{children}</span>
      {label}
    </span>
  );
}
