/**
 * maintenance-summary — Admin KPI aggregates for the maintenance dashboard.
 * GET ?from=&to=
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdminJwt } from "../_shared/auth.ts";
import { computeMaintenanceSummary } from "../_shared/maintenanceService.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const url = new URL(req.url);
    const data = await computeMaintenanceSummary({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      includeDueInRange:
        url.searchParams.get("include_due_in_range") === "true",
    });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in maintenance-summary:", error);
    const status = error instanceof Response ? error.status : 400;
    const message =
      error instanceof Response
        ? await error
            .clone()
            .json()
            .then((b: { error?: string }) => b.error)
            .catch(() => "Unauthorized")
        : (error as Error).message;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
