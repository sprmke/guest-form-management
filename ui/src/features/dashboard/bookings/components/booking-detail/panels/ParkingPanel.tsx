import { Car } from 'lucide-react';

import { DocPreview } from '@/features/dashboard/bookings/components/booking-detail/BookingDocPreview';
import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import {
  BookingDetailRow,
  BookingDetailRowBlock,
  BookingDetailRowGroup,
} from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailRow';
import { useLinkedParkingBooking } from '@/features/dashboard/bookings/hooks/useLinkedParkingBooking';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { formatMoney } from '@/utils/format/currency';

type PreviewHandler = (label: string, rawUrl: string) => void;

const PARKING_STATUS_LABEL: Record<string, string> = {
  PENDING_HOST_ACCEPTANCE: 'Searching for a match',
  PENDING_PAYMENT: 'Awaiting guest payment',
  PENDING_REVIEW: 'Payment received, finalizing',
  READY_FOR_CHECKIN: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_HOST_AVAILABLE: 'No host was available',
};

/**
 * Phase 7 — once this stay is linked to a marketplace parking booking (guest self-served
 * instead of the legacy admin-broadcast flow), show the live match/host-contact view instead
 * of the legacy owner/rate fields below. Historical bookings with no link keep rendering
 * exactly as before.
 */
export function ParkingPanel({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: PreviewHandler;
}) {
  const linkedQuery = useLinkedParkingBooking(booking.id, booking.need_parking === true);
  const linked = linkedQuery.data?.linked === true ? linkedQuery.data : null;

  if (linked) {
    return (
      <BookingDetailCard title="Parking" icon={Car}>
        <BookingDetailRowGroup>
          <BookingDetailRow
            label="Match status"
            value={PARKING_STATUS_LABEL[linked.status] ?? linked.status}
          />
          {linked.hostContact ? (
            <>
              <BookingDetailRow label="Host name" value={linked.hostContact.name} />
              <BookingDetailRow label="Host email" value={linked.hostContact.email} />
              {linked.hostContact.phone ? (
                <BookingDetailRow label="Host phone" value={linked.hostContact.phone} />
              ) : null}
            </>
          ) : null}
          {linked.endorsementSendError && !linked.endorsementSentAt ? (
            <BookingDetailRow label="Endorsement" value="Failed to send — guest can retry" />
          ) : null}
        </BookingDetailRowGroup>
        {linked.endorsementSentAt && linked.endorsementEmailSnapshot ? (
          <BookingDetailRowBlock className="border-border/60 border-t">
            <p className="text-muted-foreground mb-2 text-sm font-medium">Endorsement sent</p>
            <div
              className="prose prose-sm max-w-none"
              // Exact HTML that was emailed to the guest (Phase 5 snapshot) — same pattern as
              // the guest-facing ParkingRequestStatusView "View copy" block.
              dangerouslySetInnerHTML={{ __html: linked.endorsementEmailSnapshot }}
            />
          </BookingDetailRowBlock>
        ) : null}
      </BookingDetailCard>
    );
  }

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
