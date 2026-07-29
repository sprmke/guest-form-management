import { CalendarRange } from 'lucide-react';

import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import {
  BookingDetailRow,
  BookingDetailRowGroup,
} from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailRow';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { formatBookingDateTime } from '@/utils/format/bookingDisplay';

export function StayDetailsPanel({ booking }: { booking: BookingRow }) {
  const pax = (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  const guestSummary = `${booking.number_of_adults ?? 0} adult${(booking.number_of_adults ?? 0) !== 1 ? 's' : ''}${
    booking.number_of_children
      ? `, ${booking.number_of_children} child${booking.number_of_children !== 1 ? 'ren' : ''}`
      : ''
  } (${pax} pax)`;

  return (
    <BookingDetailCard title="Stay details" icon={CalendarRange}>
      <BookingDetailRowGroup>
        <BookingDetailRow
          label="Check-in"
          value={formatBookingDateTime(booking.check_in_date, booking.check_in_time, true)}
        />
        <BookingDetailRow
          label="Check-out"
          value={formatBookingDateTime(booking.check_out_date, booking.check_out_time, false)}
        />
        <BookingDetailRow
          label="Duration"
          value={`${booking.number_of_nights} night${booking.number_of_nights !== 1 ? 's' : ''}`}
        />
        <BookingDetailRow label="Party size" value={guestSummary} />
      </BookingDetailRowGroup>
    </BookingDetailCard>
  );
}
