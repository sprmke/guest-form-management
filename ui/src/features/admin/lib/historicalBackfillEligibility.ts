import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { BookingRow } from '@/features/admin/lib/types';
import { isSubStatusCompleted } from '@/features/admin/lib/workflow';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Bookings created before this date (Asia/Manila) may predate gmail-listener. */
export const HISTORICAL_BACKFILL_LISTENER_CUTOFF = '2026-05-12';

const MANILA = 'Asia/Manila';

export function isBookingCreatedBeforeListenerCutoff(
  createdAt: string | null | undefined,
): boolean {
  const raw = (createdAt ?? '').trim();
  if (!raw) return false;
  const created = dayjs(raw);
  if (!created.isValid()) return false;
  const cutoff = dayjs.tz(HISTORICAL_BACKFILL_LISTENER_CUTOFF, MANILA).startOf(
    'day',
  );
  return created.tz(MANILA).isBefore(cutoff);
}

/** Pending Documents + still waiting on Azure GAF approval. */
export function isAwaitingPendingGafApproval(
  booking: Pick<BookingRow, 'status' | 'gaf_completed_at' | 'approved_gaf_pdf_url' | 'gaf_manual_incomplete'>,
): boolean {
  if (booking.status !== 'PENDING_DOCUMENTS') return false;
  return !isSubStatusCompleted('PENDING_GAF', booking);
}

export function shouldOfferHistoricalApprovalBackfill(
  booking: Pick<
    BookingRow,
    | 'status'
    | 'created_at'
    | 'gaf_completed_at'
    | 'approved_gaf_pdf_url'
    | 'gaf_manual_incomplete'
  >,
): boolean {
  return (
    isBookingCreatedBeforeListenerCutoff(booking.created_at) &&
    isAwaitingPendingGafApproval(booking)
  );
}

export function historicalBackfillDismissStorageKey(bookingId: string): string {
  return `admin:historical-backfill-dismissed:${bookingId}`;
}
