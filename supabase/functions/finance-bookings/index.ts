/**
 * finance-bookings — Paginated stays ledger with computed financial columns.
 */

import { listFinanceBookings } from "../_shared/financeService.ts";
import type { FinancePeriodBasis } from "../_shared/financePeriodFilter.ts";
import { jsonError, jsonResponse } from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

function parseBasis(raw: string | null): FinancePeriodBasis {
  if (raw === "check_out" || raw === "completed") return raw;
  return "check_in";
}

function parseSort(raw: string | null) {
  const allowed = [
    "check_in_date:asc",
    "check_in_date:desc",
    "host_net:desc",
    "host_net:asc",
  ] as const;
  if (allowed.includes(raw as (typeof allowed)[number])) {
    return raw as (typeof allowed)[number];
  }
  return "check_in_date:desc" as const;
}

serveAdmin("finance-bookings", async (req) => {
  if (req.method !== "GET") {
    return jsonError(req, "Method not allowed", 405);
  }

  const url = new URL(req.url);
  const p = url.searchParams;
  const page = Math.max(1, parseInt(p.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(p.get("limit") ?? "31", 10)),
  );

  const { rows, total } = await listFinanceBookings({
    from: p.get("from"),
    to: p.get("to"),
    basis: parseBasis(p.get("basis")),
    includeCancelled: p.get("include_cancelled") === "true",
    completedOnly: p.get("completed_only") === "true",
    q: p.get("q") ?? undefined,
    page,
    limit,
    sort: parseSort(p.get("sort")),
  });

  return jsonResponse(req, { success: true, data: rows, total, page, limit });
});
