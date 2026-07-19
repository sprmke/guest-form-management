import { formatMoneyCompact } from '@/utils/format/currency';
import { useCallback, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import type { BookingCalendarPillLabelMode } from '@/features/dashboard/bookings/components/calendar/BookingCalendarPillLabelToggle';
import { CalendarDayBookingCard } from '@/features/dashboard/bookings/components/calendar/CalendarDayBookingCard';
import { amountPerOccupiedNight } from '@/features/dashboard/bookings/components/calendar/calendarStayAmounts';
import {
  CalendarOccupancyPill,
  OccupancyCalendarView,
} from '@/features/dashboard/bookings/components/calendar/OccupancyCalendarView';
import { bookingListDisplayName } from '@/features/dashboard/bookings/lib/bookingListDisplay';
import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';

import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import type { DatePreset } from '@/lib/date/navigation';
import { fromIsoDate } from '@/lib/date/navigation';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  initialMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Compact grid without day-detail sidebar; day/pill clicks open booking detail. */
  variant?: 'full' | 'mini';
  /** ISO bounds from dashboard date filter (mini only). */
  rangeFrom?: string;
  rangeTo?: string;
  datePreset?: DatePreset;
  /** Mini calendar day pills: guest first name or booking rate. */
  pillLabelMode?: BookingCalendarPillLabelMode;
};

function bookingPillLabel(row: BookingRow): string {
  return row.primary_guest_name?.split(' ')[0] || row.guest_facebook_name?.split(' ')[0] || 'Guest';
}

function bookingPillPriceLabel(row: BookingRow): string {
  const perNight = amountPerOccupiedNight(row.booking_rate, row.number_of_nights);
  if (perNight == null) return '—';
  return formatMoneyCompact(perNight);
}

export function BookingCalendarView({
  rows,
  isLoading,
  error,
  isRefreshing,
  initialMonth,
  onMonthChange,
  variant = 'full',
  rangeFrom,
  rangeTo,
  datePreset,
  pillLabelMode = 'name',
}: Props) {
  const navigate = useNavigate();
  const mini = variant === 'mini';

  const visibleRange = useMemo(() => {
    if (!mini || !rangeFrom || !rangeTo) return undefined;
    const from = fromIsoDate(rangeFrom);
    const to = fromIsoDate(rangeTo);
    if (!from || !to) return undefined;
    return { from, to };
  }, [mini, rangeFrom, rangeTo]);

  const openBooking = useCallback(
    (row: BookingRow) => {
      navigate(`/bookings/${row.id}`);
    },
    [navigate]
  );

  const handleDayClick = useCallback(
    (_day: Date, items: BookingRow[]) => {
      if (items.length === 0) return;
      openBooking(items[0]);
    },
    [openBooking]
  );

  return (
    <OccupancyCalendarView
      rows={rows}
      isLoading={isLoading}
      error={error}
      isRefreshing={isRefreshing}
      getItemKey={(row) => row.id}
      getItemStatus={(row) => row.status}
      renderPill={(row) => {
        const guestName = bookingListDisplayName(row);
        const priceLabel = bookingPillPriceLabel(row);
        const label = pillLabelMode === 'price' ? priceLabel : bookingPillLabel(row);

        return (
          <CalendarOccupancyPill
            status={row.status}
            label={label}
            title={`${guestName} · ${priceLabel}/night · ${statusLabel(row.status)}`}
            labelClassName={pillLabelMode === 'price' ? 'tabular-nums' : undefined}
          />
        );
      }}
      renderDayItem={(row) => (
        <CalendarDayBookingCard
          row={row}
          amount={{ mode: 'booking_rate', amount: row.booking_rate }}
          onOpen={() => openBooking(row)}
        />
      )}
      entityLabel="bookings"
      entityLabelSingular="booking"
      initialMonth={initialMonth}
      onMonthChange={onMonthChange}
      emptySelectCaption="Click any day to see bookings with a stay that night"
      emptyDayCaption="No guest stays are scheduled for this night"
      layout={mini ? 'grid-only' : 'full'}
      compact={mini}
      embedded={mini}
      onDayClick={mini ? handleDayClick : undefined}
      onItemClick={mini ? openBooking : undefined}
      visibleRange={visibleRange}
      datePreset={datePreset}
      hideNavigation={mini && Boolean(visibleRange)}
    />
  );
}
