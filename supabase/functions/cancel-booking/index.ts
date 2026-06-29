/**
 * cancel-booking — Admin endpoint to cancel a booking.
 */

import { WorkflowOrchestrator } from "../_shared/workflowOrchestrator.ts";
import { DatabaseService } from "../_shared/databaseService.ts";
import { notifyTelegramCancellation } from "../_shared/telegramMarketing.ts";
import {
  jsonError,
  jsonResponse,
  readJsonBody,
  requireHttpMethod,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("cancel-booking", async (req) => {
  requireHttpMethod(req, "POST");
  const body = await readJsonBody(req);
  const { bookingId, confirm, devControls = {} } = body;

  if (!bookingId) {
    return jsonError(req, "Booking ID is required");
  }

  if (confirm !== true) {
    return jsonError(
      req,
      'Cancellation requires confirmation. Send { "confirm": true } in the request body.',
    );
  }

  const booking = await DatabaseService.getBookingById(String(bookingId));
  if (!booking) {
    return jsonError(req, "Booking not found", 404);
  }

  if (booking.status === "CANCELLED") {
    return jsonError(req, "Booking is already cancelled");
  }

  console.log(
    `Cancelling booking: ${bookingId} (${booking.primary_guest_name})`,
  );

  const result = await WorkflowOrchestrator.transition(
    String(bookingId),
    "CANCELLED",
    {},
    devControls,
    true,
  );

  try {
    await notifyTelegramCancellation(
      booking.check_in_date as string,
      booking.check_out_date as string,
    );
  } catch (tgErr) {
    console.error(
      "[cancel-booking] Telegram notify failed (non-fatal):",
      tgErr,
    );
  }

  return jsonResponse(req, {
    success: true,
    message:
      "Booking cancelled successfully. All data preserved; dates are now available.",
    bookingId,
    guestName: booking.primary_guest_name,
    data: result,
  });
});
