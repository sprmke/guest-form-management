/**
 * telegram-maintenance-cron — Hourly maintenance reminders via pg_cron + pg_net.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  runMaintenanceDueReminders,
  verifyMaintenanceCronSecret,
} from "../_shared/telegramMaintenance.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== "POST") {
      throw new Error(`Method ${req.method} not allowed`);
    }

    if (!verifyMaintenanceCronSecret(req)) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const result = await runMaintenanceDueReminders();
    console.log("[telegram-maintenance-cron]", JSON.stringify(result));
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("telegram-maintenance-cron:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
