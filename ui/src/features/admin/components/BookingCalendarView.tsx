import { useNavigate } from 'react-router-dom';
import { bookingListDisplayName } from '@/features/admin/lib/bookingListDisplay';
import { statusLabel } from '@/features/admin/lib/bookingStatus';
import {
  CalendarDayBookingCard,
} from '@/features/admin/components/calendar/CalendarDayBookingCard';
import {
  CalendarOccupancyPill,
  OccupancyCalendarView,
} from '@/features/admin/components/calendar/OccupancyCalendarView';
import type { BookingRow } from '@/features/admin/lib/types';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  initialMonth?: Date;
  onMonthChange?: (month: Date) => void;
};

function bookingPillLabel(row: BookingRow): string {
  return (
    row.primary_guest_name?.split(' ')[0] ||
    row.guest_facebook_name?.split(' ')[0] ||
    'Guest'
  );
}

export function BookingCalendarView({
  rows,
  isLoading,
  error,
  isRefreshing,
  initialMonth,
  onMonthChange,
}: Props) {
  const navigate = useNavigate();

  return (
    <OccupancyCalendarView
      rows={rows}
      isLoading={isLoading}
      error={error}
      isRefreshing={isRefreshing}
      getItemKey={(row) => row.id}
      getItemStatus={(row) => row.status}
      renderPill={(row) => (
        <CalendarOccupancyPill
          status={row.status}
          label={bookingPillLabel(row)}
          title={`${bookingListDisplayName(row)} · ${statusLabel(row.status)}`}
        />
      )}
      renderDayItem={(row) => (
        <CalendarDayBookingCard
          row={row}
          amount={{ mode: 'booking_rate', amount: row.booking_rate }}
          onOpen={() => navigate(`/bookings/${row.id}`)}
        />
      )}
      entityLabel="bookings"
      entityLabelSingular="booking"
      initialMonth={initialMonth}
      onMonthChange={onMonthChange}
      emptySelectCaption="Click any day to see bookings with a stay that night"
      emptyDayCaption="No guest stays are scheduled for this night"
    />
  );
}
