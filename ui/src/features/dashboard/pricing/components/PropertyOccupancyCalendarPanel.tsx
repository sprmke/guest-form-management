import { useMemo, useState } from 'react';

import { endOfMonth, format, startOfMonth } from 'date-fns';

import { BookingCalendarView } from '@/features/dashboard/bookings/components/BookingCalendarView';
import {
  BookingCalendarPillLabelToggle,
  type BookingCalendarPillLabelMode,
} from '@/features/dashboard/bookings/components/calendar/BookingCalendarPillLabelToggle';
import { useBookings } from '@/features/dashboard/bookings/hooks/useBookings';
import {
  DEFAULT_BOOKINGS_QUERY,
  type BookingsQuery,
} from '@/features/dashboard/bookings/lib/types';

/** Higher cap so an entire month of stays renders without pagination. */
const OCCUPANCY_BOOKINGS_LIMIT = 100;

export function PropertyOccupancyCalendarPanel() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [pillLabelMode, setPillLabelMode] = useState<BookingCalendarPillLabelMode>('name');

  const query = useMemo(
    (): BookingsQuery => ({
      ...DEFAULT_BOOKINGS_QUERY,
      from: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
      to: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
      showCompletedBookings: true,
      limit: OCCUPANCY_BOOKINGS_LIMIT,
      page: 1,
    }),
    [currentMonth]
  );

  const { data, isLoading, isFetching, error } = useBookings(query);

  return (
    <BookingCalendarView
      rows={data?.rows ?? []}
      isLoading={isLoading}
      error={error ? (error as Error).message : null}
      isRefreshing={isFetching}
      initialMonth={currentMonth}
      onMonthChange={setCurrentMonth}
      pillLabelMode={pillLabelMode}
      navigationAccessory={
        <BookingCalendarPillLabelToggle
          value={pillLabelMode}
          onChange={setPillLabelMode}
          size="toolbar"
        />
      }
    />
  );
}
