/**
 * validate-booking-receipts — Admin one-shot AI backfill for payment receipts
 * and guest valid ID.
 *
 * When a booking already has receipt image URLs but no persisted AI verdict
 * (e.g. legacy rows before validation shipped), download each image from
 * Storage and run Gemini once. Skips COMPLETED / CANCELLED bookings.
 *
 * Trigger: POST /functions/v1/validate-booking-receipts
 * Body:    { bookingId: string }
 * Auth:    verifyAdminJwt(req)
 */

import { DatabaseService } from "../_shared/databaseService.ts";
import {
  backfillMissingReceiptAiVerdicts,
  dbPatchFromReceiptBackfillItems,
} from "../_shared/receiptValidationService.ts";
import {
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("validate-booking-receipts", async (req) => {
  requireHttpMethod(req, "POST");
  const body = await readJsonBody(req);
  const bookingId = String(body.bookingId ?? "").trim();
  if (!bookingId) throw new Error("bookingId is required");

  const booking = await DatabaseService.getBookingById(bookingId);
  if (!booking) throw new Error(`Booking not found: ${bookingId}`);

  const { validated, errors } = await backfillMissingReceiptAiVerdicts(
    booking as Record<string, unknown>,
  );

  if (validated.length > 0) {
    await DatabaseService.setWorkflowFields(
      bookingId,
      dbPatchFromReceiptBackfillItems(validated),
    );
    console.log(
      `[validate-booking-receipts] ${bookingId}: validated ${validated.length} receipt(s)`,
    );
  }

  if (errors.length > 0) {
    console.warn(
      `[validate-booking-receipts] ${bookingId}: AI model errors for ${errors.length} receipt(s)`,
      errors,
    );
  }

  return jsonSuccess(req, { validated, errors });
});
