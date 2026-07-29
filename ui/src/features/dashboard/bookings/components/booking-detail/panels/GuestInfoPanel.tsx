import { UserRound } from 'lucide-react';

import { DocPreview } from '@/features/dashboard/bookings/components/booking-detail/BookingDocPreview';
import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import {
  BookingDetailRow,
  BookingDetailRowBlock,
  BookingDetailRowGroup,
} from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailRow';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

type PreviewHandler = (label: string, rawUrl: string) => void;

export function GuestInfoPanel({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: PreviewHandler;
}) {
  return (
    <BookingDetailCard title="Guest information" icon={UserRound}>
      <BookingDetailRowGroup>
        <BookingDetailRow label="Facebook / Airbnb name" value={booking.guest_facebook_name} />
        <BookingDetailRow label="Primary guest" value={booking.primary_guest_name} />
        <BookingDetailRow label="Email" value={booking.guest_email} />
        <BookingDetailRow label="Phone" value={booking.guest_phone_number} />
        <BookingDetailRow label="Address" value={booking.guest_address} />
        <BookingDetailRow label="Nationality" value={booking.nationality} />
      </BookingDetailRowGroup>
      {booking.valid_id_url?.trim() ? (
        <BookingDetailRowBlock className="border-border/60 border-t">
          <p className="text-muted-foreground mb-2 text-xs font-medium">Valid ID</p>
          <DocPreview
            label="Valid ID"
            url={booking.valid_id_url.trim()}
            onPreview={onPreview}
            receiptAiVerdict={booking.valid_id_ai_verdict}
            receiptAiVariant="valid_id"
          />
        </BookingDetailRowBlock>
      ) : null}
      {booking.approved_gaf_pdf_url ? (
        <BookingDetailRowBlock className="border-border/60 border-t">
          <p className="text-muted-foreground mb-2 text-xs font-medium">Approved GAF</p>
          <DocPreview
            label="Approved GAF"
            url={booking.approved_gaf_pdf_url}
            onPreview={onPreview}
          />
        </BookingDetailRowBlock>
      ) : null}
    </BookingDetailCard>
  );
}
