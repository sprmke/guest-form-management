/**
 * transition-booking — Admin endpoint to advance a booking through the workflow.
 */

import { isBookingStatus } from "../_shared/statusMachine.ts";
import { WorkflowOrchestrator } from "../_shared/workflowOrchestrator.ts";
import {
  jsonResponse,
  readJsonBody,
  requireHttpMethod,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("transition-booking", async (req) => {
  requireHttpMethod(req, "POST");
  const body = await readJsonBody(req);
  const {
    bookingId,
    toStatus,
    payload = {},
    devControls = {},
    manual = true,
  } = body;

  if (!bookingId) throw new Error("bookingId is required");
  if (!toStatus) throw new Error("toStatus is required");
  if (!isBookingStatus(toStatus)) {
    throw new Error(`Invalid toStatus: "${toStatus}"`);
  }

  console.log(
    `[transition-booking] ${bookingId} → ${toStatus} (manual=${manual})`,
  );

  const result = await WorkflowOrchestrator.transition(
    String(bookingId),
    toStatus,
    payload,
    devControls,
    manual,
  );

  return jsonResponse(req, { success: true, data: result });
});
