/**
 * finance-export — Admin CSV download for finance reports.
 * GET ?type=overview|stays|operating|transactions|combined&basis=&from=&to=...
 */

import { corsHeaders } from "../_shared/cors.ts";
import { buildFinanceExportCsv } from "../_shared/financeExport.ts";
import type { FinancePeriodBasis } from "../_shared/financePeriodFilter.ts";
import { jsonError } from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

function parseBasis(raw: string | null): FinancePeriodBasis {
  if (raw === "check_out" || raw === "completed") return raw;
  return "check_in";
}

function parseType(
  raw: string | null,
): "overview" | "stays" | "operating" | "combined" {
  if (raw === "transactions") return "operating";
  if (raw === "stays" || raw === "operating" || raw === "combined") return raw;
  return "overview";
}

serveAdmin("finance-export", async (req) => {
  if (req.method !== "GET") {
    return jsonError(req, "Method not allowed", 405);
  }

  const url = new URL(req.url);
  const p = url.searchParams;
  const { filename, body } = await buildFinanceExportCsv({
    type: parseType(p.get("type")),
    from: p.get("from"),
    to: p.get("to"),
    basis: parseBasis(p.get("basis")),
    includeCancelled: p.get("include_cancelled") === "true",
    completedOnly: p.get("completed_only") === "true",
    q: p.get("q") ?? undefined,
  });

  return new Response(body, {
    headers: {
      ...corsHeaders(req),
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
