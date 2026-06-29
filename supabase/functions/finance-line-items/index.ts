/**
 * finance-line-items — Admin CRUD for property-wide operating expenses/income.
 */

import {
  createFinanceLineItem,
  deleteFinanceLineItem,
  extendRecurringSeries,
  listOperatingLineItems,
  listRecurringSeriesItems,
  updateFinanceLineItem,
  type FinanceLineItemKind,
} from "../_shared/financeService.ts";
import {
  isRecurrenceEditScope,
  isRecurrenceInterval,
} from "../_shared/financeRecurrence.ts";
import { parseFinanceTelegramReminderInput } from "../_shared/telegramFinance.ts";
import {
  jsonError,
  jsonResponse,
  jsonSuccess,
  readJsonBody,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

function isKind(v: unknown): v is FinanceLineItemKind {
  return v === "expense" || v === "income";
}

serveAdmin("finance-line-items", async (req, { email }) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const seriesId = url.searchParams.get("recurrence_series_id");
    if (seriesId) {
      const items = await listRecurringSeriesItems(seriesId);
      return jsonSuccess(req, items);
    }
    const items = await listOperatingLineItems({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      q: url.searchParams.get("q") ?? undefined,
      includeDueInRange:
        url.searchParams.get("include_due_in_range") === "true",
    });
    return jsonSuccess(req, items);
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);

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
        return jsonError(req, "Invalid fields");
      }
      const result = await extendRecurringSeries(
        seriesId,
        direction,
        extend_until,
        email,
      );
      return jsonSuccess(req, result.rows, {
        created_count: result.created_count,
      });
    }

    if (!isKind(body.kind)) {
      return jsonError(req, "Invalid kind");
    }
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    const amount = Number(body.amount);
    const occurred_on =
      typeof body.occurred_on === "string" ? body.occurred_on.slice(0, 10) : "";
    if (
      !label ||
      !category ||
      Number.isNaN(amount) ||
      amount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)
    ) {
      return jsonError(req, "Invalid fields");
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
      return jsonError(req, "Invalid recurrence interval");
    }

    const result = await createFinanceLineItem(
      {
        kind: body.kind,
        label,
        amount,
        category,
        occurred_on,
        notes: typeof body.notes === "string" ? body.notes : null,
        recurrence_interval,
        recurrence_until,
        telegramReminder: parseFinanceTelegramReminderInput(body),
      },
      email,
    );
    return jsonSuccess(req, result.row, {
      created_count: result.created_count,
    });
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return jsonError(req, "Missing id");
    }
    const scope = isRecurrenceEditScope(body.scope) ? body.scope : "this";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    const amount = Number(body.amount);
    if (!label || !category || Number.isNaN(amount) || amount <= 0) {
      return jsonError(req, "Invalid fields");
    }
    const patch: Parameters<typeof updateFinanceLineItem>[1] = {};
    if (body.kind !== undefined && isKind(body.kind)) patch.kind = body.kind;
    patch.label = label;
    patch.amount = amount;
    patch.category = category;
    if (typeof body.occurred_on === "string")
      patch.occurred_on = body.occurred_on.slice(0, 10);
    if (body.notes !== undefined) {
      patch.notes = typeof body.notes === "string" ? body.notes : null;
    }
    patch.telegramReminder = parseFinanceTelegramReminderInput(body);
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
      return jsonError(req, "Invalid recurrence interval");
    }
    if (recurrence_interval) patch.recurrence_interval = recurrence_interval;
    if (typeof body.recurrence_until === "string" && body.recurrence_until) {
      patch.recurrence_until = body.recurrence_until.slice(0, 10);
    }
    const result = await updateFinanceLineItem(id, patch, scope);
    return jsonSuccess(req, result.row, {
      updated_count: result.updated_count,
    });
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) {
      return jsonError(req, "Missing id");
    }
    const scopeParam = url.searchParams.get("scope");
    const scope = isRecurrenceEditScope(scopeParam) ? scopeParam : "this";
    const result = await deleteFinanceLineItem(id, scope);
    return jsonResponse(req, {
      success: true,
      deleted_count: result.deleted_count,
    });
  }

  return jsonError(req, "Method not allowed", 405);
});
