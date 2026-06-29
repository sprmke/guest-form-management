/**
 * claim-sd-voucher — Public POST that idempotently awards a next-stay voucher.
 *
 * Called when the guest taps "Claim it!" on /sd-form (after the
 * Facebook-review link is opened). The handler ignores the optional client
 * `code` and rolls server-side from `VOUCHER_WIN_WEIGHTS` so the outcome is not
 * tamperable. If a voucher is already on the booking, that one is returned
 * instead of rolling again.
 *
 * Status guard: only available while the booking is `READY_FOR_CHECKOUT`.
 */

import { DatabaseService } from "../_shared/databaseService.ts";
import { rollVoucher } from "../_shared/voucher.ts";
import type { VoucherCode } from "../_shared/voucher.ts";
import {
  jsonResponse,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from "../_shared/httpResponse.ts";
import { servePublic } from "../_shared/serveEdge.ts";

servePublic("claim-sd-voucher", async (req) => {
  requireHttpMethod(req, "POST");
  const body = await readJsonBody(req);
  const bookingId = (
    typeof body.bookingId === "string" ? body.bookingId : ""
  ).trim();
  if (!bookingId) throw new Error("bookingId is required");

  const row = await DatabaseService.getBookingById(bookingId);
  if (!row || row.status !== "READY_FOR_CHECKOUT") {
    return jsonResponse(
      req,
      {
        success: false,
        error: "not_available",
        message: "This form is no longer available for this booking.",
      },
      409,
    );
  }

  let code = (row.next_stay_voucher_code ?? null) as VoucherCode | null;
  let amount =
    row.next_stay_voucher_amount != null
      ? Number(row.next_stay_voucher_amount)
      : null;
  const alreadyAwarded = !!code;

  if (!code) {
    const rolled = rollVoucher();
    code = rolled.code;
    amount = rolled.amount;
    await DatabaseService.setWorkflowFields(bookingId, {
      next_stay_voucher_code: code,
      next_stay_voucher_amount: amount,
      next_stay_voucher_awarded_at: new Date().toISOString(),
    });
  }

  return jsonSuccess(req, { code, amount, alreadyAwarded });
});
