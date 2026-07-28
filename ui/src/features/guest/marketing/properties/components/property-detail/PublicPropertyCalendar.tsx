import { useState, useMemo } from 'react';

import { ChevronLeft, ChevronRight, CalendarDays, X, ArrowRight } from 'lucide-react';

import { usePropertyReserve } from '@/features/guest/marketing/properties/hooks/usePropertyReserve';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

// ── Types ──────────────────────────────────────────────────────────────────────

type DayState = 'available' | 'booked' | 'today' | 'checkIn' | 'checkOut' | 'inRange' | 'past';

export interface PublicPropertyCalendarProps {
  propertyName: string;
  propertySlug: string;
  isCustom?: boolean;
  initialMonth?: Date;
  /** Controlled mode: externally managed check-in/check-out dates */
  value?: { checkIn: Date | null; checkOut: Date | null };
  /** Fires whenever check-in or check-out changes in controlled mode */
  onDatesChange?: (checkIn: Date | null, checkOut: Date | null) => void;
  /** Hide the "Book Now" link/action area (e.g. when embedded inside BookingCard modal) */
  showBookingAction?: boolean;
  /** Reduce internal padding for embedding inside dialogs */
  compact?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatShortDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]?.slice(0, 3)} ${d.getDate()}`;
}

/** Deterministic mock bookings: returns a Set of booked day numbers for the given month. */
function getBookedDays(year: number, month: number): Set<number> {
  const seed = (year * 12 + month) % 7;
  const patterns: number[][] = [
    [3, 4, 5, 12, 13, 14, 15, 20, 21, 22, 27, 28],
    [1, 2, 3, 4, 10, 11, 12, 13, 18, 19, 20, 24, 25, 26, 27],
    [5, 6, 7, 12, 13, 14, 20, 21, 22, 23, 24, 25, 27, 28],
    [2, 3, 4, 5, 6, 14, 15, 16, 17, 22, 23, 24],
    [4, 5, 6, 7, 8, 15, 16, 17, 18, 23, 24, 25, 26],
    [6, 7, 8, 9, 13, 14, 15, 16, 20, 21, 22, 23, 26, 27, 28],
    [1, 2, 3, 9, 10, 11, 12, 17, 18, 19, 25, 26, 27],
  ];
  return new Set(patterns[seed] ?? patterns[0]);
}

// ── Range validation helper ────────────────────────────────────────────────────

/**
 * Returns true if any day strictly between `from` (exclusive) and `to` (exclusive)
 * is either past or booked. Used to prevent selections that span over blocked dates.
 */
function hasBlockedDayBetween(from: Date, to: Date, todayMidnight: Date): boolean {
  const cursor = new Date(from);
  cursor.setDate(cursor.getDate() + 1); // start exclusive

  while (cursor < to) {
    // Past check
    if (cursor < todayMidnight) return true;
    // Booked check
    const booked = getBookedDays(cursor.getFullYear(), cursor.getMonth());
    if (booked.has(cursor.getDate())) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

/**
 * Given a check-in date and an arbitrary hover/target date, returns the furthest
 * date the user can actually reach without crossing a blocked day. If the very
 * next day after check-in is blocked, returns null (no valid range possible).
 */
function clampToFirstBlocked(from: Date, to: Date, todayMidnight: Date): Date | null {
  const cursor = new Date(from);
  cursor.setDate(cursor.getDate() + 1); // start exclusive

  while (cursor <= to) {
    if (cursor < todayMidnight) {
      // This day is past — cap at the previous day
      const cap = new Date(cursor);
      cap.setDate(cap.getDate() - 1);
      return cap <= from ? null : cap;
    }
    const booked = getBookedDays(cursor.getFullYear(), cursor.getMonth());
    if (booked.has(cursor.getDate())) {
      // This day is booked — cap at the previous day
      const cap = new Date(cursor);
      cap.setDate(cap.getDate() - 1);
      return cap <= from ? null : cap;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return to;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PublicPropertyCalendar({
  propertySlug,
  isCustom = false,
  initialMonth,
  value,
  onDatesChange,
  showBookingAction = true,
  compact = false,
}: PublicPropertyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth ?? new Date());

  // Internal state — used in uncontrolled mode
  const [internalCheckIn, setInternalCheckIn] = useState<Date | null>(null);
  const [internalCheckOut, setInternalCheckOut] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Controlled vs uncontrolled: derive active values
  const isControlled = value !== undefined;
  const checkIn = isControlled ? (value?.checkIn ?? null) : internalCheckIn;
  const checkOut = isControlled ? (value?.checkOut ?? null) : internalCheckOut;

  /** Unified setter that routes to either controlled callback or internal state */
  const setDates = (newCheckIn: Date | null, newCheckOut: Date | null) => {
    if (isControlled) {
      onDatesChange?.(newCheckIn, newCheckOut);
    } else {
      setInternalCheckIn(newCheckIn);
      setInternalCheckOut(newCheckOut);
    }
  };

  // ── Calendar data ──────────────────────────────────────────────────────────

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const bookedDays = getBookedDays(year, month);
    return { year, month, monthName: MONTH_NAMES[month]!, daysInMonth, firstDay, bookedDays };
  }, [currentMonth]);

  const today = useMemo(() => toMidnight(new Date()), []);

  /**
   * The effective hover end — capped at the day before the first blocked date
   * after check-in, so the hover preview never shows an illegal range.
   */
  const effectiveHoverDate = useMemo(() => {
    if (!checkIn || !hoverDate || checkOut) return null;
    const ci = toMidnight(checkIn);
    const hd = toMidnight(hoverDate);
    if (hd <= ci) return null;
    return clampToFirstBlocked(ci, hd, today);
  }, [checkIn, hoverDate, checkOut, today]);

  // ── Day state ──────────────────────────────────────────────────────────────

  const getDayState = (day: number): DayState => {
    const cellDate = toMidnight(new Date(calendarData.year, calendarData.month, day));

    if (cellDate < today) return 'past';
    if (calendarData.bookedDays.has(day)) return 'booked';
    if (cellDate.getTime() === today.getTime()) return 'today';

    if (checkIn) {
      const ci = toMidnight(checkIn);
      if (cellDate.getTime() === ci.getTime()) return 'checkIn';

      if (checkOut) {
        const co = toMidnight(checkOut);
        if (cellDate.getTime() === co.getTime()) return 'checkOut';
        if (cellDate > ci && cellDate < co) return 'inRange';
      } else if (effectiveHoverDate) {
        const ehd = toMidnight(effectiveHoverDate);
        if (ehd > ci && cellDate > ci && cellDate < ehd) return 'inRange';
      }
    }

    return 'available';
  };

  // ── Interaction handlers ───────────────────────────────────────────────────

  const handleDayClick = (day: number) => {
    const state = getDayState(day);
    if (state === 'booked' || state === 'past') return;

    const clickedDate = toMidnight(new Date(calendarData.year, calendarData.month, day));

    if (!checkIn || checkOut) {
      // Start fresh
      setDates(clickedDate, null);
    } else {
      const ci = toMidnight(checkIn);
      if (clickedDate <= ci) {
        // Clicked at or before check-in → reset check-in
        setDates(clickedDate, null);
      } else if (hasBlockedDayBetween(ci, clickedDate, today)) {
        // Range crosses a blocked date — restart from the clicked date
        setDates(clickedDate, null);
      } else {
        setDates(checkIn, clickedDate);
      }
    }
    setHoverDate(null);
  };

  const handleDayMouseEnter = (day: number) => {
    if (checkIn && !checkOut) {
      setHoverDate(new Date(calendarData.year, calendarData.month, day));
    }
  };

  const prevMonth = () =>
    setCurrentMonth((p) => {
      const d = new Date(p);
      d.setMonth(d.getMonth() - 1);
      return d;
    });

  const nextMonth = () =>
    setCurrentMonth((p) => {
      const d = new Date(p);
      d.setMonth(d.getMonth() + 1);
      return d;
    });

  const clearSelection = () => {
    setDates(null, null);
    setHoverDate(null);
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const nightsCount =
    checkIn && checkOut
      ? Math.round(
          (toMidnight(checkOut).getTime() - toMidnight(checkIn).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

  const { reserve } = usePropertyReserve({
    propertySlug,
    checkIn,
    checkOut,
  });

  // Build cells: leading empty slots + day slots
  const cells: Array<{ day: number | null }> = [
    ...Array.from({ length: calendarData.firstDay }, () => ({ day: null })),
    ...Array.from({ length: calendarData.daysInMonth }, (_, i) => ({ day: i + 1 })),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'w-full max-w-[900px]',
        isCustom
          ? 'rounded-3xl p-7 sm:p-10'
          : compact
            ? 'rounded-none bg-transparent'
            : 'border-border bg-card rounded-2xl border p-6 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.12)] sm:p-8'
      )}
      style={
        isCustom ? { background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)' } : undefined
      }
    >
      {/* ── Month navigation ── */}
      <div className="mb-7 flex items-center justify-between">
        <h2
          className={cn(
            'text-2xl font-bold tracking-tight',
            isCustom ? 'text-green-900' : 'text-foreground'
          )}
        >
          {calendarData.monthName} {calendarData.year}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
              isCustom
                ? 'bg-white/80 text-green-700 hover:bg-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
              isCustom
                ? 'bg-white/80 text-green-700 hover:bg-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Day-of-week labels ── */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className={cn(
              'py-2 text-center text-[11px] font-semibold uppercase tracking-wider',
              isCustom ? 'text-green-700' : 'text-muted-foreground'
            )}
          >
            {name}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="grid grid-cols-7 gap-1" onMouseLeave={() => setHoverDate(null)}>
        {cells.map((cell, index) => {
          if (!cell.day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const state = getDayState(cell.day);
          const isSelectable = state !== 'booked' && state !== 'past';

          return (
            <button
              key={cell.day}
              onClick={() => handleDayClick(cell.day!)}
              onMouseEnter={() => handleDayMouseEnter(cell.day!)}
              disabled={!isSelectable}
              aria-label={`${calendarData.monthName} ${cell.day}, ${state === 'booked' ? 'booked' : state === 'past' ? 'unavailable' : 'available'}`}
              aria-pressed={state === 'checkIn' || state === 'checkOut'}
              className={cn(
                'relative aspect-square select-none rounded-xl text-[13px] font-medium transition-all duration-100',
                // ── Default theme ─────────────────────────────────────────────
                !isCustom &&
                  state === 'available' &&
                  'text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer',
                !isCustom && state === 'past' && 'text-muted-foreground/30 cursor-not-allowed',
                !isCustom &&
                  state === 'booked' &&
                  'bg-muted/30 text-muted-foreground/30 decoration-muted-foreground/30 cursor-not-allowed line-through',
                !isCustom &&
                  state === 'today' &&
                  'text-primary ring-primary cursor-pointer font-bold ring-2',
                !isCustom &&
                  (state === 'checkIn' || state === 'checkOut') &&
                  'bg-primary text-primary-foreground cursor-pointer font-semibold shadow-sm',
                !isCustom &&
                  state === 'inRange' &&
                  'bg-primary/10 text-primary cursor-pointer rounded-xl',
                // ── Custom / forest-green theme ───────────────────────────────
                isCustom &&
                  state === 'available' &&
                  'cursor-pointer text-green-900 hover:bg-white/60',
                isCustom && state === 'past' && 'cursor-not-allowed text-green-900/20',
                isCustom &&
                  state === 'booked' &&
                  'cursor-not-allowed bg-green-600/20 text-green-900/30 line-through decoration-green-900/20',
                isCustom &&
                  state === 'today' &&
                  'cursor-pointer font-bold text-green-900 ring-2 ring-green-600',
                isCustom &&
                  (state === 'checkIn' || state === 'checkOut') &&
                  'cursor-pointer bg-green-600 font-semibold text-white shadow-sm',
                isCustom &&
                  state === 'inRange' &&
                  'cursor-pointer rounded-xl bg-white/40 text-green-900'
              )}
            >
              {cell.day}

              {/* Today dot */}
              {state === 'today' && (
                <span
                  className={cn(
                    'absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
                    isCustom ? 'bg-green-600' : 'bg-primary'
                  )}
                />
              )}

              {/* Booked icon (custom theme) */}
              {isCustom && state === 'booked' && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg"
                >
                  🔑
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Date selection summary (hidden in compact/modal mode) ── */}
      {!compact && checkIn ? (
        <div
          className={cn(
            'mt-5 flex items-center justify-between gap-4 rounded-2xl border p-4',
            isCustom ? 'border-green-200/60 bg-white/70' : 'border-primary/20 bg-primary/10'
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <CalendarDays
              className={cn('h-4 w-4 shrink-0', isCustom ? 'text-green-600' : 'text-primary')}
            />
            <div className="min-w-0">
              {!checkOut ? (
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    isCustom ? 'text-green-900' : 'text-foreground'
                  )}
                >
                  Check-in: <span className="font-semibold">{formatShortDate(checkIn)}</span>
                  <span
                    className={cn(
                      'ml-2 text-xs',
                      isCustom ? 'text-green-600' : 'text-muted-foreground'
                    )}
                  >
                    Select check-out date
                  </span>
                </p>
              ) : (
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCustom ? 'text-green-900' : 'text-foreground'
                  )}
                >
                  <span className="font-semibold">{formatShortDate(checkIn)}</span>
                  <ArrowRight className="mx-1.5 inline h-3 w-3 opacity-60" />
                  <span className="font-semibold">{formatShortDate(checkOut)}</span>
                  {nightsCount && (
                    <span
                      className={cn(
                        'ml-2 text-xs',
                        isCustom ? 'text-green-600' : 'text-muted-foreground'
                      )}
                    >
                      · {nightsCount} night{nightsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={clearSelection}
              aria-label="Clear selection"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                isCustom
                  ? 'text-green-600 hover:bg-green-100'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {showBookingAction && checkOut ? (
              <Button
                type="button"
                size="sm"
                onClick={reserve}
                className={cn(
                  'rounded-full px-5 text-white',
                  isCustom
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                Book Now
              </Button>
            ) : null}
          </div>
        </div>
      ) : !compact ? (
        <p
          className={cn(
            'mt-4 text-center text-xs',
            isCustom ? 'text-green-600' : 'text-muted-foreground'
          )}
        >
          Select your check-in date to begin booking
        </p>
      ) : null}
    </div>
  );
}
