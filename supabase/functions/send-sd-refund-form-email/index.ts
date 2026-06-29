/**
 * send-sd-refund-form-email — Admin-only: re-send the guest Check-out & SD Refund Details email.
 *
 * POST { bookingId }
 * Status must be READY_FOR_CHECKIN (after automated email may run) or READY_FOR_CHECKOUT.
 * Does not change status; updates sd_refund_form_emailed_at.
 */

import { DatabaseService } from "../_shared/databaseService.ts";
import { sendSdRefundFormRequest } from "../_shared/emailService.ts";
import {
  jsonError,
  jsonResponse,
  readJsonBody,
  requireHttpMethod,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("send-sd-refund-form-email", async (req) => {
  requireHttpMethod(req, "POST");
  const body = await readJsonBody(req);
  const bookingId = body?.bookingId;
  if (!bookingId || typeof bookingId !== "string") {
    return jsonError(req, "bookingId (string) is required");
  }

  const booking = await DatabaseService.getBookingById(bookingId);
  if (!booking) {
    return jsonError(req, "Booking not found", 404);
  }

  if (
    booking.status !== "READY_FOR_CHECKOUT" &&
    booking.status !== "READY_FOR_CHECKIN"
  ) {
    return jsonError(
      req,
      `Booking must be in READY_FOR_CHECKIN or READY_FOR_CHECKOUT (current: ${booking.status})`,
    );
  }

  await sendSdRefundFormRequest(booking);
  await DatabaseService.setWorkflowFields(bookingId, {
    sd_refund_form_emailed_at: new Date().toISOString(),
  });

  return jsonResponse(req, { success: true, bookingId });
});
