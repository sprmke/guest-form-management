/**
 * booking-ai-review — Admin-triggered AI summary & validation for a single booking.
 *
 * Trigger: POST /functions/v1/booking-ai-review?property_id=<id>
 * Body:    { bookingId: string, force?: boolean }
 * Auth:    resolveScopedPropertyAccess(req, 'bookings:edit')
 *
 * One completed run per booking — a finished job is returned as-is (no second AI pass).
 * `force` only clears a live `processing` row; it does not re-run a completed job.
 *
 * Runs **inline** on this request (not EdgeRuntime.waitUntil). Local `functions serve`
 * exposes waitUntil but drops background work after the response — that left rows stuck
 * at `processing` with 0/5 progress. Upserts after each section still stream to the UI
 * via GET polling while this POST is open.
 */

import {
  executeBookingAiReview,
  getBookingAiReviewById,
  isStaleStuckProcessingRow,
  prepareBookingAiReviewJob,
} from '../_shared/bookingAiReviewService.ts';
import { jsonSuccess, readJsonBody, requireHttpMethod } from '../_shared/httpResponse.ts';
import {
  resolveScopedPropertyAccess,
  verifyBookingBelongsToProperty,
} from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('booking-ai-review', async (req, user) => {
  requireHttpMethod(req, 'POST');
  const { property, org } = await resolveScopedPropertyAccess(req, 'bookings:edit');
  const propertyId = property.id;

  const body = await readJsonBody(req);
  const bookingId = String(body.bookingId ?? '').trim();
  const force = body.force === true;
  if (!bookingId) throw new Error('bookingId is required');

  await verifyBookingBelongsToProperty(bookingId, propertyId);

  const existing = await getBookingAiReviewById(bookingId);
  // Finished once — do not spend tokens on a second pass (UI has no re-run either).
  if (existing?.job_status === 'completed') {
    return jsonSuccess(req, existing);
  }
  if (existing?.job_status === 'processing' && !force && !isStaleStuckProcessingRow(existing)) {
    return jsonSuccess(req, existing);
  }

  await prepareBookingAiReviewJob(bookingId, propertyId, user.id);

  console.log(`[booking-ai-review] ${bookingId}: running inline`);
  const row = await executeBookingAiReview(bookingId, propertyId, user.id, org.id);
  console.log(`[booking-ai-review] ${bookingId}: finished with ${row.job_status}`);

  return jsonSuccess(req, row);
});
