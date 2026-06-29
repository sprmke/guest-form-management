/**
 * get-guest-payment-info — Public GET for GCash + GAF defaults on the guest form.
 * Trigger: guest SPA on load (Payment step + submit). Auth: anon key only (verify_jwt = false).
 */

import { serializeGuestPaymentInfo } from "../_shared/appSettings.ts";
import { jsonError, jsonSuccess } from "../_shared/httpResponse.ts";
import { servePublic } from "../_shared/serveEdge.ts";

servePublic("get-guest-payment-info", async (req) => {
  if (req.method !== "GET") {
    return jsonError(req, `Method ${req.method} not allowed`, 405);
  }

  const data = await serializeGuestPaymentInfo();
  return jsonSuccess(req, data);
});
