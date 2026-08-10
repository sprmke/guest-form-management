import {
  type DocumentAiVerdictVariant,
  type ReceiptAiVerdict,
} from '@/features/dashboard/bookings/components/ReceiptAiVerdictBadge';
import { receiptAiPreviewLoading } from '@/features/dashboard/bookings/hooks/useReceiptAiBackfill';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

export type BookingAiValidationItem = {
  id: string;
  label: string;
  url: string | null;
  verdict: ReceiptAiVerdict;
  summary: string | null;
  variant: DocumentAiVerdictVariant;
  loading: boolean;
};

function pushItem(
  items: BookingAiValidationItem[],
  item: Omit<BookingAiValidationItem, 'loading'> & { loading?: boolean }
) {
  const url = item.url?.trim() || null;
  const verdict = item.verdict;
  const hasVerdict = Boolean(verdict && String(verdict).toLowerCase() !== 'skipped');
  if (!url && !hasVerdict) return;
  items.push({
    ...item,
    url,
    summary: item.summary?.trim() || null,
    loading: item.loading ?? false,
  });
}

/** All AI-checked documents on a booking (receipts + primary valid ID). */
export function collectBookingAiValidations(
  booking: BookingRow,
  isDocumentAiBackfilling = false
): BookingAiValidationItem[] {
  const items: BookingAiValidationItem[] = [];

  pushItem(items, {
    id: 'dp_receipt',
    label: 'Downpayment receipt',
    url: booking.payment_receipt_url ?? null,
    verdict: booking.dp_receipt_ai_verdict,
    summary: booking.dp_receipt_ai_summary ?? null,
    variant: 'receipt',
    loading: receiptAiPreviewLoading(
      isDocumentAiBackfilling,
      booking.payment_receipt_url,
      booking.dp_receipt_ai_verdict
    ),
  });

  pushItem(items, {
    id: 'balance_receipt',
    label: 'Balance receipt',
    url: booking.guest_balance_payment_receipt_url ?? null,
    verdict: booking.balance_receipt_ai_verdict,
    summary: booking.balance_receipt_ai_summary ?? null,
    variant: 'receipt',
    loading: receiptAiPreviewLoading(
      isDocumentAiBackfilling,
      booking.guest_balance_payment_receipt_url,
      booking.balance_receipt_ai_verdict
    ),
  });

  pushItem(items, {
    id: 'parking_receipt',
    label: 'Parking payment receipt',
    url: booking.parking_payment_receipt_url ?? null,
    verdict: booking.parking_receipt_ai_verdict,
    summary: booking.parking_receipt_ai_summary ?? null,
    variant: 'receipt',
    loading: receiptAiPreviewLoading(
      isDocumentAiBackfilling,
      booking.parking_payment_receipt_url,
      booking.parking_receipt_ai_verdict
    ),
  });

  pushItem(items, {
    id: 'valid_id',
    label: 'Valid ID',
    url: booking.valid_id_url ?? null,
    verdict: booking.valid_id_ai_verdict,
    summary: booking.valid_id_ai_summary ?? null,
    variant: 'valid_id',
    loading: receiptAiPreviewLoading(
      isDocumentAiBackfilling,
      booking.valid_id_url,
      booking.valid_id_ai_verdict
    ),
  });

  return items;
}

export function bookingAiValidationSeverityRank(verdict: ReceiptAiVerdict): number {
  switch (String(verdict ?? '').toLowerCase()) {
    case 'invalid':
      return 0;
    case 'unclear':
      return 1;
    case 'likely_valid':
      return 2;
    case 'valid':
      return 3;
    case 'skipped':
      return 4;
    default:
      return 5;
  }
}

/** Invalid / unclear first so hosts see blockers immediately. */
export function sortBookingAiValidations(
  items: BookingAiValidationItem[]
): BookingAiValidationItem[] {
  return [...items].sort(
    (a, b) =>
      bookingAiValidationSeverityRank(a.verdict) - bookingAiValidationSeverityRank(b.verdict) ||
      a.label.localeCompare(b.label)
  );
}
