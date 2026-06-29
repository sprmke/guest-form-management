/**
 * finance-summary — Admin KPI aggregates for the finance dashboard.
 */

import { computeFinanceSummary } from "../_shared/financeService.ts";
import type { FinancePeriodBasis } from "../_shared/financePeriodFilter.ts";
import { jsonError, jsonSuccess } from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

function parseBasis(raw: string | null): FinancePeriodBasis {
  if (raw === "check_out" || raw === "completed") return raw;
  return "check_in";
}

serveAdmin("finance-summary", async (req) => {
  if (req.method !== "GET") {
    return jsonError(req, "Method not allowed", 405);
  }

  const url = new URL(req.url);
  const p = url.searchParams;
  const data = await computeFinanceSummary({
    from: p.get("from"),
    to: p.get("to"),
    basis: parseBasis(p.get("basis")),
    includeCancelled: p.get("include_cancelled") === "true",
    completedOnly: p.get("completed_only") === "true",
    q: p.get("q") ?? undefined,
  });

  return jsonSuccess(req, data);
});
