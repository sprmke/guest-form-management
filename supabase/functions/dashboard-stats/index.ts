/**
 * dashboard-stats — Admin home dashboard aggregates.
 */

import { computeDashboardStats } from "../_shared/dashboardService.ts";
import { jsonError, jsonSuccess } from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("dashboard-stats", async (req) => {
  if (req.method !== "GET") {
    return jsonError(req, "Method not allowed", 405);
  }

  const url = new URL(req.url);
  const data = await computeDashboardStats({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  return jsonSuccess(req, data);
});
