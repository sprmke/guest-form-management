/**
 * maintenance-items — Admin CRUD for property maintenance reminders.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdminJwt } from "../_shared/auth.ts";
import {
  createMaintenanceItem,
  deleteMaintenanceItem,
  extendRecurringSeries,
  listMaintenanceItems,
  listRecurringSeriesItems,
  updateMaintenanceItem,
} from "../_shared/maintenanceService.ts";
import {
  isRecurrenceEditScope,
  isRecurrenceInterval,
} from "../_shared/financeRecurrence.ts";
import { parseMaintenanceTelegramReminderInput } from "../_shared/telegramMaintenance.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { email } = await verifyAdminJwt(req);
    const url = new URL(req.url);

    if (req.method === "GET") {
      const seriesId = url.searchParams.get("recurrence_series_id");
      if (seriesId) {
        const items = await listRecurringSeriesItems(seriesId);
        return new Response(JSON.stringify({ success: true, data: items }), {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const items = await listMaintenanceItems({
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
        q: url.searchParams.get("q") ?? undefined,
        includeDueInRange:
          url.searchParams.get("include_due_in_range") === "true",
      });
      return new Response(JSON.stringify({ success: true, data: items }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      if (body.action === "extend_series") {
        const seriesId =
          typeof body.recurrence_series_id === "string"
            ? body.recurrence_series_id
            : "";
        const direction = body.direction === "before" ? "before" : "after";
        const extend_until =
          typeof body.extend_until === "string"
            ? body.extend_until.slice(0, 10)
            : "";
        if (!seriesId || !/^\d{4}-\d{2}-\d{2}$/.test(extend_until)) {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid fields" }),
            {
              status: 400,
              headers: {
                ...corsHeaders(req),
                "Content-Type": "application/json",
              },
            },
          );
        }
        const result = await extendRecurringSeries(
          seriesId,
          direction,
          extend_until,
          email,
        );
        return new Response(
          JSON.stringify({
            success: true,
            data: result.rows,
            created_count: result.created_count,
          }),
          {
            headers: {
              ...corsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const label = typeof body.label === "string" ? body.label.trim() : "";
      const category =
        typeof body.category === "string" ? body.category.trim() : "";
      const scheduled_on =
        typeof body.scheduled_on === "string"
          ? body.scheduled_on.slice(0, 10)
          : "";
      if (
        !label ||
        !category ||
        !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_on)
      ) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid fields" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const recurrence_interval =
        body.recurrence_interval === null || body.recurrence_interval === "none"
          ? null
          : isRecurrenceInterval(body.recurrence_interval)
            ? body.recurrence_interval
            : null;
      const recurrence_until =
        typeof body.recurrence_until === "string" && body.recurrence_until
          ? body.recurrence_until.slice(0, 10)
          : null;

      if (
        body.recurrence_interval &&
        body.recurrence_interval !== "none" &&
        !recurrence_interval
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid recurrence interval",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const result = await createMaintenanceItem(
        {
          label,
          category,
          scheduled_on,
          notes: typeof body.notes === "string" ? body.notes : null,
          recurrence_interval,
          recurrence_until,
          telegramReminder: parseMaintenanceTelegramReminderInput(body),
        },
        email,
      );
      return new Response(
        JSON.stringify({
          success: true,
          data: result.row,
          created_count: result.created_count,
        }),
        {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing id" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }
      const scope = isRecurrenceEditScope(body.scope) ? body.scope : "this";
      const label = typeof body.label === "string" ? body.label.trim() : "";
      const category =
        typeof body.category === "string" ? body.category.trim() : "";
      if (!label || !category) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid fields" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }
      const patch: Parameters<typeof updateMaintenanceItem>[1] = {
        label,
        category,
      };
      if (typeof body.scheduled_on === "string") {
        patch.scheduled_on = body.scheduled_on.slice(0, 10);
      }
      if (body.notes !== undefined) {
        patch.notes = typeof body.notes === "string" ? body.notes : null;
      }
      patch.telegramReminder = parseMaintenanceTelegramReminderInput(body);
      const recurrence_interval =
        body.recurrence_interval === null || body.recurrence_interval === "none"
          ? undefined
          : isRecurrenceInterval(body.recurrence_interval)
            ? body.recurrence_interval
            : undefined;
      if (
        body.recurrence_interval &&
        body.recurrence_interval !== "none" &&
        !recurrence_interval
      ) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid recurrence interval" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }
      if (recurrence_interval) patch.recurrence_interval = recurrence_interval;
      if (typeof body.recurrence_until === "string" && body.recurrence_until) {
        patch.recurrence_until = body.recurrence_until.slice(0, 10);
      }
      const result = await updateMaintenanceItem(id, patch, scope);
      return new Response(
        JSON.stringify({
          success: true,
          data: result.row,
          updated_count: result.updated_count,
        }),
        {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing id" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }
      const scopeParam = url.searchParams.get("scope");
      const scope = isRecurrenceEditScope(scopeParam) ? scopeParam : "this";
      const result = await deleteMaintenanceItem(id, scope);
      return new Response(
        JSON.stringify({ success: true, deleted_count: result.deleted_count }),
        {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in maintenance-items:", error);
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
