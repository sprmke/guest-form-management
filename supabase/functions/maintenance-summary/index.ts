/**
 * maintenance-summary — Admin KPI aggregates for the maintenance dashboard.
 */

import { computeMaintenanceSummary } from "../_shared/maintenanceService.ts";
import { jsonError, jsonSuccess } from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("maintenance-summary", async (req) => {
  if (req.method !== "GET") {
    return jsonError(req, "Method not allowed", 405);
  }

  const url = new URL(req.url);
  const data = await computeMaintenanceSummary({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    includeDueInRange: url.searchParams.get("include_due_in_range") === "true",
  });

  return jsonSuccess(req, data);
});
