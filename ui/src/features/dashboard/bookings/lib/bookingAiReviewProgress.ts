import type { BookingAiReview } from '@/features/dashboard/bookings/lib/types';

/** No section movement for this long while still `processing` → orphaned job. */
const STUCK_PROCESSING_MS = 60_000;

/** Optimistic row shown the moment a run starts — enables polling before POST returns. */
export function buildOptimisticProcessingReview(bookingId: string): BookingAiReview {
  return {
    booking_id: bookingId,
    job_status: 'processing',
    stay_details_status: 'pending',
    guests_status: 'pending',
    parking_status: 'pending',
    pets_status: 'pending',
    pricing_status: 'pending',
    stay_details_result: null,
    guests_result: null,
    parking_result: null,
    pets_result: null,
    pricing_result: null,
    flag_count: 0,
    has_blocking_flag: false,
  };
}

export function isStuckProcessingReview(review: BookingAiReview | null | undefined): boolean {
  if (!review || review.job_status !== 'processing') return false;
  const statuses = [
    review.stay_details_status,
    review.guests_status,
    review.parking_status,
    review.pets_status,
    review.pricing_status,
  ];
  if (statuses.some((status) => status !== 'pending')) return false;
  const updated = review.updated_at ? Date.parse(review.updated_at) : NaN;
  if (!Number.isFinite(updated)) return false;
  return Date.now() - updated >= STUCK_PROCESSING_MS;
}

export function isBookingAiReviewRunning(
  review: BookingAiReview | null | undefined,
  mutationPending = false
): boolean {
  if (isStuckProcessingReview(review)) return false;
  return mutationPending || review?.job_status === 'processing';
}

/** True once an admin has finished an AI Summary job for this booking. */
export function hasBookingAiReviewRun(review: BookingAiReview | null | undefined): boolean {
  if (!review) return false;
  return review.job_status === 'completed' || review.job_status === 'failed';
}
