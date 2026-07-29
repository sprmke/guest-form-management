import { FolderOpen } from 'lucide-react';

import { DocPreview } from '@/features/dashboard/bookings/components/booking-detail/BookingDocPreview';
import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import { BookingDetailRowBlock } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailRow';
import type { ReceiptAiVerdict } from '@/features/dashboard/bookings/components/ReceiptAiVerdictBadge';
import { receiptAiPreviewLoading } from '@/features/dashboard/bookings/hooks/useReceiptAiBackfill';
import {
  ADMIN_GUEST_VIEW_SLOTS,
  shouldShowAdminGuestViewSlot,
} from '@/features/dashboard/bookings/lib/adminGuestSlots';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

type PreviewHandler = (label: string, rawUrl: string) => void;

type DocEntry = {
  label: string;
  url: string;
  receiptAiVerdict?: ReceiptAiVerdict;
  receiptAiLoading?: boolean;
  receiptAiVariant?: 'receipt' | 'valid_id';
};

function collectBookingFiles(booking: BookingRow, isDocumentAiBackfilling: boolean): DocEntry[] {
  const docs: DocEntry[] = [];

  const push = (
    label: string,
    url: string | null | undefined,
    meta?: Pick<DocEntry, 'receiptAiVerdict' | 'receiptAiLoading' | 'receiptAiVariant'>
  ) => {
    const trimmed = url?.trim();
    if (!trimmed) return;
    docs.push({ label, url: trimmed, ...meta });
  };

  push('Booking PDF', booking.pdf_url);
  push('Downpayment receipt', booking.payment_receipt_url, {
    receiptAiVerdict: booking.dp_receipt_ai_verdict,
    receiptAiLoading: receiptAiPreviewLoading(
      isDocumentAiBackfilling,
      booking.payment_receipt_url,
      booking.dp_receipt_ai_verdict
    ),
  });
  push('Payment balance receipt', booking.guest_balance_payment_receipt_url, {
    receiptAiVerdict: booking.balance_receipt_ai_verdict,
    receiptAiLoading: receiptAiPreviewLoading(
      isDocumentAiBackfilling,
      booking.guest_balance_payment_receipt_url,
      booking.balance_receipt_ai_verdict
    ),
  });
  push('Valid ID', booking.valid_id_url, {
    receiptAiVerdict: booking.valid_id_ai_verdict,
    receiptAiLoading: receiptAiPreviewLoading(
      isDocumentAiBackfilling,
      booking.valid_id_url,
      booking.valid_id_ai_verdict
    ),
    receiptAiVariant: 'valid_id',
  });
  push('Approved GAF', booking.approved_gaf_pdf_url);
  push('Approved pet form', booking.approved_pet_pdf_url);
  push('Parking endorsement', booking.parking_endorsement_url);
  push('Pet photo', booking.pet_image_url);
  push('Vaccination record', booking.pet_vaccination_url);
  push('SD refund receipt', booking.sd_refund_receipt_url);
  push('Parking payment receipt', booking.parking_payment_receipt_url, {
    receiptAiVerdict: booking.parking_receipt_ai_verdict,
    receiptAiLoading: receiptAiPreviewLoading(
      isDocumentAiBackfilling,
      booking.parking_payment_receipt_url,
      booking.parking_receipt_ai_verdict
    ),
  });

  for (const slot of ADMIN_GUEST_VIEW_SLOTS) {
    if (!shouldShowAdminGuestViewSlot(slot, booking)) continue;
    const validIdUrl = booking[slot.validIdUrlKey]?.trim();
    if (!validIdUrl) continue;
    push(`${slot.label} valid ID`, validIdUrl, {
      receiptAiVerdict: slot.validIdAiVerdictKey ? booking[slot.validIdAiVerdictKey] : undefined,
      receiptAiLoading: slot.validIdAiVerdictKey
        ? receiptAiPreviewLoading(
            isDocumentAiBackfilling,
            validIdUrl,
            booking[slot.validIdAiVerdictKey]
          )
        : false,
      receiptAiVariant: 'valid_id',
    });
  }

  return docs;
}

export function DocumentsPanel({
  booking,
  onPreview,
  isDocumentAiBackfilling = false,
}: {
  booking: BookingRow;
  onPreview: PreviewHandler;
  isDocumentAiBackfilling?: boolean;
}) {
  const docs = collectBookingFiles(booking, isDocumentAiBackfilling);

  if (docs.length === 0) {
    return (
      <BookingDetailCard title="Files" icon={FolderOpen}>
        <BookingDetailRowBlock>
          <p className="text-muted-foreground text-sm">No files uploaded for this booking.</p>
        </BookingDetailRowBlock>
      </BookingDetailCard>
    );
  }

  return (
    <BookingDetailCard title="Files" icon={FolderOpen}>
      <BookingDetailRowBlock>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <DocPreview
              key={`${d.label}-${d.url}`}
              label={d.label}
              url={d.url}
              onPreview={onPreview}
              receiptAiVerdict={d.receiptAiVerdict}
              receiptAiLoading={d.receiptAiLoading}
              receiptAiVariant={d.receiptAiVariant}
            />
          ))}
        </div>
      </BookingDetailRowBlock>
    </BookingDetailCard>
  );
}
