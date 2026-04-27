import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  subMonths,
} from 'date-fns';
import {
  ArrowUpRight,
  CalendarCheck,
  Car,
  ChevronLeft,
  ChevronRight,
  Dog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { GuestAvatar } from '@/features/admin/components/GuestAvatar';
import {
  formatBookingDate,
  formatMoney,
} from '@/features/admin/lib/formatters';
import { statusLabel } from '@/features/admin/lib/bookingStatus';
import type { BookingRow } from '@/features/admin/lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  /** Optional initial month — defaults to today. */
  initialMonth?: Date;
};

/**
 * Calendar (month-grid) view for the bookings dashboard.
 * Mirrors property-management-app's `BookingsCalendarView`:
 *   - Two-column layout on desktop: month grid + selected-day detail panel.
 *   - Single column stacked on mobile.
 *   - Each booking spans every day from check-in → check-out.
 *
 * Differs in:
 *   - Date strings come in as MM-DD-YYYY (not ISO); we parse via date-fns.
 *   - Multiple bookings on the same day are surfaced as +N counters with the
 *     full list visible in the detail panel.
 */
export function BookingCalendarView({
  rows,
  isLoading,
  error,
  isRefreshing,
  initialMonth,
}: Props) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => initialMonth ?? new Date(),
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const bookingsByDay = useMemo(() => buildBookingsByDay(rows), [rows]);

  const calendarGrid = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    // Sunday-first week. `getDay` returns 0 (Sun) … 6 (Sat), which already
    // matches the column index when the first column is Sunday.
    const startDay = getDay(start);
    const paddingStart = startDay;
    return { days, paddingStart };
  }, [currentMonth]);

  const selectedDayBookings = useMemo<BookingRow[]>(() => {
    if (!selectedDay) return [];
    return bookingsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];
  }, [selectedDay, bookingsByDay]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((cur) =>
      direction === 'prev' ? subMonths(cur, 1) : addMonths(cur, 1),
    );
    setSelectedDay(null);
  };

  if (error) {
    return (
      <div
        className="flex flex-col gap-3 justify-center items-center py-20 text-center bg-white rounded-xl"
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex justify-center items-center bg-red-50 rounded-full size-9">
          <span className="text-base font-black leading-none text-red-500">
            !
          </span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-slate-800">
            Could not load bookings
          </p>
          <p className="mt-1 text-[12px] text-slate-400 max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4 lg:grid-cols-3 transition-opacity duration-300',
        isRefreshing && 'opacity-60',
      )}
    >
      {/* ── Month grid (2/3) ────────────────────────────────────── */}
      <div
        className="bg-white rounded-xl overflow-hidden lg:col-span-2"
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 sm:px-4 py-3"
          style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}
        >
          <h2 className="text-[14px] font-bold text-slate-800">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              aria-label="Previous month"
              className={cn(
                'inline-flex items-center justify-center rounded-lg min-w-[36px] min-h-[36px]',
                'border bg-white text-sidebar-muted border-sidebar-border',
                'hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
                'transition-all duration-100',
              )}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDay(null);
              }}
              className={cn(
                'inline-flex items-center justify-center rounded-lg px-2.5 min-h-[36px] text-[12px] font-semibold',
                'border bg-white text-sidebar-muted border-sidebar-border',
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
                'inline-flex items-center justify-center rounded-lg min-w-[36px] min-h-[36px]',
                'border bg-white text-sidebar-muted border-sidebar-border',
                'hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
                'transition-all duration-100',
              )}
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 px-2 sm:px-3 pt-3 pb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1 px-2 sm:px-3 pb-3">
          {Array.from({ length: calendarGrid.paddingStart }).map((_, idx) => (
            <div key={`pad-${idx}`} className="aspect-square sm:min-h-[88px]" />
          ))}

          {isLoading
            ? calendarGrid.days.map((day) => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className="rounded-lg bg-slate-50 animate-pulse aspect-square sm:min-h-[88px]"
                />
              ))
            : calendarGrid.days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayBookings = bookingsByDay.get(key) ?? [];
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const hasBookings = dayBookings.length > 0;
                const todayFlag = isToday(day);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    aria-label={`${format(day, 'MMMM d, yyyy')} – ${
                      hasBookings
                        ? `${dayBookings.length} booking${dayBookings.length === 1 ? '' : 's'}`
                        : 'no bookings'
                    }`}
                    className={cn(
                      'relative flex flex-col items-stretch justify-start rounded-lg p-1.5 transition-all duration-100',
                      'aspect-square sm:aspect-auto sm:min-h-[88px] outline-none',
                      'hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
                      isSelected &&
                        'ring-2 ring-sidebar-primary/60 bg-sidebar-accent/30',
                      !isCurrentMonth && 'opacity-35',
                    )}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          'text-[12px] font-semibold leading-none',
                          todayFlag
                            ? 'inline-flex items-center justify-center size-5 rounded-full bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-slate-700 px-1',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {hasBookings && (
                        <span className="text-[9px] font-black tabular-nums text-slate-400">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Booking pills */}
                    {hasBookings && (
                      <div className="hidden sm:flex flex-col gap-0.5 mt-1.5 overflow-hidden">
                        {dayBookings.slice(0, 2).map((b) => (
                          <BookingPill key={b.id} row={b} />
                        ))}
                        {dayBookings.length > 2 && (
                          <span className="text-[9px] font-bold text-slate-400 px-1 mt-0.5">
                            +{dayBookings.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Mobile dot indicator */}
                    {hasBookings && (
                      <div className="sm:hidden mt-auto flex justify-center pb-0.5">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: 'hsl(var(--sidebar-primary))' }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
        </div>
      </div>

      {/* ── Selected day detail (1/3) ─────────────────────────────── */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}
        >
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
            {selectedDay
              ? format(selectedDay, 'EEEE, MMMM d, yyyy')
              : 'Day details'}
          </h3>
          {selectedDay && (
            <p className="mt-0.5 text-[11px] text-slate-400">
              {selectedDayBookings.length === 0
                ? 'No bookings on this day'
                : `${selectedDayBookings.length} booking${selectedDayBookings.length === 1 ? '' : 's'}`}
            </p>
          )}
        </div>

        <div className="p-3">
          {!selectedDay ? (
            <EmptyDetail
              title="Select a day"
              caption="Click any day to see the bookings that span it"
            />
          ) : selectedDayBookings.length === 0 ? (
            <EmptyDetail
              title="No bookings"
              caption="There are no bookings spanning this day"
            />
          ) : (
            <div className="space-y-2">
              {selectedDayBookings.map((b) => (
                <DayBookingItem
                  key={b.id}
                  row={b}
                  onOpen={() => navigate(`/bookings/${b.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

function parseBookingDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // DB stores MM-DD-YYYY but legacy / migration rows may be YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parse(value, 'yyyy-MM-dd', new Date());
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const d = parse(value, 'MM-dd-yyyy', new Date());
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function buildBookingsByDay(rows: BookingRow[]): Map<string, BookingRow[]> {
  const map = new Map<string, BookingRow[]>();
  for (const row of rows) {
    const start = parseBookingDate(row.check_in_date);
    const end = parseBookingDate(row.check_out_date);
    if (!start || !end || start > end) continue;
    const days = eachDayOfInterval({ start, end });
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      const existing = map.get(key);
      if (existing) existing.push(row);
      else map.set(key, [row]);
    }
  }
  return map;
}

// ─── Pieces ────────────────────────────────────────────────────

function BookingPill({ row }: { row: BookingRow }) {
  const name =
    row.primary_guest_name?.split(' ')[0] ||
    row.guest_facebook_name?.split(' ')[0] ||
    'Guest';
  return (
    <div
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 truncate"
      style={{
        background: 'hsl(var(--sidebar-accent) / 0.5)',
        border: '1px solid hsl(var(--sidebar-border))',
      }}
      title={`${row.primary_guest_name || row.guest_facebook_name || 'Guest'} · ${statusLabel(row.status)}`}
    >
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ background: 'hsl(var(--sidebar-primary))' }}
      />
      <span className="truncate">{name}</span>
    </div>
  );
}

function DayBookingItem({
  row,
  onOpen,
}: {
  row: BookingRow;
  onOpen: () => void;
}) {
  const name =
    row.primary_guest_name ||
    row.guest_facebook_name ||
    row.guest_email ||
    'Guest';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open booking for ${name}`}
      className={cn(
        'group w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors',
        'hover:bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
      )}
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <GuestAvatar
        name={name}
        validIdUrl={row.valid_id_url}
        size="md"
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold text-slate-800 truncate">
            {name}
          </p>
          <ArrowUpRight
            className="size-3.5 text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors"
            aria-hidden
          />
        </div>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={row.status} />
          {row.need_parking && (
            <span
              title="Needs parking"
              className="inline-flex items-center justify-center size-5 rounded bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70"
            >
              <Car className="size-3" aria-hidden />
            </span>
          )}
          {row.has_pets && (
            <span
              title="Has pets"
              className="inline-flex items-center justify-center size-5 rounded bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70"
            >
              <Dog className="size-3" aria-hidden />
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400 truncate">
          {formatBookingDate(row.check_in_date)}
          <span className="mx-1.5 text-slate-300">→</span>
          {formatBookingDate(row.check_out_date)}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {row.number_of_nights}{' '}
          {row.number_of_nights === 1 ? 'night' : 'nights'}
          {row.booking_rate != null && (
            <>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-semibold text-slate-600">
                {formatMoney(row.booking_rate)}
              </span>
            </>
          )}
        </p>
      </div>
    </button>
  );
}

function EmptyDetail({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="flex flex-col gap-2 items-center justify-center py-10 text-center">
      <CalendarCheck className="size-9 text-slate-200" aria-hidden />
      <div>
        <p className="text-[13px] font-semibold text-slate-600">{title}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{caption}</p>
      </div>
    </div>
  );
}
