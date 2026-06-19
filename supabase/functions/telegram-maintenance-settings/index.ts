/**
 * telegram-maintenance-settings — Admin GET/PATCH/POST for maintenance Telegram config.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdminJwt } from "../_shared/auth.ts";
import { DatabaseService } from "../_shared/databaseService.ts";
import {
  ensureMaintenanceSettingsRow,
  renderMaintenanceDraftPreview,
  runMaintenanceDueReminders,
  sanitizeMaintenanceReminderTemplate,
  sendMaintenanceDraftPreview,
  serializeMaintenanceSettings,
  verifyMaintenanceTelegramEnv,
  type TelegramMaintenanceSettings,
} from "../_shared/telegramMaintenance.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method === "GET") {
      await ensureMaintenanceSettingsRow();
      const row = await DatabaseService.getTelegramMaintenanceSettings();
      if (!row) {
        return new Response(
          JSON.stringify({ success: false, error: "Settings row missing" }),
          {
            status: 500,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: serializeMaintenanceSettings(
            row as unknown as TelegramMaintenanceSettings,
          ),
        }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const patch: Record<string, unknown> = {};

      if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

      if (typeof body.defaultReminderTemplate === "string") {
        patch.default_reminder_template = sanitizeMaintenanceReminderTemplate(
          body.defaultReminderTemplate.slice(0, 8000),
        );
      }

      if (Object.keys(patch).length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "No valid fields to update" }),
          {
            status: 400,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          },
        );
      }

      const updated = await DatabaseService.updateTelegramMaintenanceSettings(patch);
      const cronSync = await DatabaseService.syncTelegramMaintenanceHourlyCronJob();

      return new Response(
        JSON.stringify({
          success: true,
          data: serializeMaintenanceSettings(
            updated as unknown as TelegramMaintenanceSettings,
          ),
          cronSync,
        }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      await ensureMaintenanceSettingsRow();
      const body = await req.json().catch(() => ({}));
      const action = typeof body.action === "string" ? body.action : "";

      if (action === "verify_maintenance_telegram_env") {
        const verify = await verifyMaintenanceTelegramEnv();
        return new Response(JSON.stringify({ success: true, verify }), {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      if (action === "send_test_due_reminders") {
        const result = await runMaintenanceDueReminders({ force: true });
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      if (action === "send_draft_preview") {
        const text = typeof body.text === "string" ? body.text : "";
        if (!text.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: "text is required" }),
            {
              status: 400,
              headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            },
          );
        }
        const preview = await sendMaintenanceDraftPreview(text.slice(0, 8000));
        return new Response(
          JSON.stringify({
            success: preview.sent,
            sent: preview.sent,
            error: preview.error,
            messageCharCount: preview.messageCharCount,
          }),
          {
            status: preview.sent ? 200 : 400,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          },
        );
      }

      if (action === "render_draft_preview") {
        const text = typeof body.text === "string" ? body.text : "";
        if (!text.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: "text is required" }),
            {
              status: 400,
              headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            },
          );
        }
        const rendered = await renderMaintenanceDraftPreview(text.slice(0, 8000));
        if (rendered.error || !rendered.renderedText) {
          return new Response(
            JSON.stringify({
              success: false,
              error: rendered.error ?? "render_failed",
            }),
            {
              status: 400,
              headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            },
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            renderedText: rendered.renderedText,
            placeholders: rendered.placeholders,
          }),
          { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error:
            `Unknown action: ${action || "(missing)"}. Use verify_maintenance_telegram_env | send_test_due_reminders | send_draft_preview | render_draft_preview`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    throw new Error(`Method ${req.method} not allowed`);
  } catch (error) {
    const status = error instanceof Response ? error.status : 400;
    const message =
      error instanceof Response
        ? await error
            .clone()
            .json()
            .then((b: { error?: string }) => b.error)
            .catch(() => "Error")
        : (error as Error).message;
    console.error("telegram-maintenance-settings:", error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
