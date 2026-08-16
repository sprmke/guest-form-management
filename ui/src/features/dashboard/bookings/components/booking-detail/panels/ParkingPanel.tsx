import { Car } from 'lucide-react';

import { DocPreview } from '@/features/dashboard/bookings/components/booking-detail/BookingDocPreview';
import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import {
  BookingDetailRow,
  BookingDetailRowBlock,
  BookingDetailRowGroup,
} from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailRow';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { formatMoney } from '@/utils/format/currency';

type PreviewHandler = (label: string, rawUrl: string) => void;

export function ParkingPanel({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: PreviewHandler;
}) {
  const vehicle = [booking.car_brand_model, booking.car_color].filter(Boolean).join(' · ');

  return (
    <BookingDetailCard title="Parking" icon={Car}>
      <BookingDetailRowGroup>
        <BookingDetailRow label="Plate number" value={booking.car_plate_number} />
        <BookingDetailRow label="Vehicle" value={vehicle || undefined} />
        <BookingDetailRow label="Parking owner / agent" value={booking.parking_owner} />
        {booking.parking_rate_guest != null ? (
          <BookingDetailRow
            label="Guest parking rate"
            value={formatMoney(booking.parking_rate_guest)}
          />
        ) : null}
        {booking.parking_rate_paid != null ? (
          <BookingDetailRow
            label="Owner parking rate"
            value={formatMoney(booking.parking_rate_paid)}
          />
        ) : null}
      </BookingDetailRowGroup>
      {booking.parking_endorsement_url ? (
        <BookingDetailRowBlock className="border-border/60 border-t">
          <DocPreview
            label="Parking endorsement"
            url={booking.parking_endorsement_url}
            onPreview={onPreview}
          />
        </BookingDetailRowBlock>
      ) : null}
    </BookingDetailCard>
  );
}
