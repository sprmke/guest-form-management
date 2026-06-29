/**
 * telegram-finance-settings — Admin GET/PATCH/POST for finance Telegram config.
 */

import { DatabaseService } from "../_shared/databaseService.ts";
import {
  ensureFinanceSettingsRow,
  renderFinanceDraftPreview,
  runFinanceDueReminders,
  sanitizeFinanceReminderTemplate,
  sendFinanceDraftPreview,
  serializeFinanceSettings,
  verifyFinanceTelegramEnv,
  type TelegramFinanceSettings,
} from "../_shared/telegramFinance.ts";
import {
  handleTelegramRenderDraftPreview,
  handleTelegramSendDraftPreview,
  parseAction,
  telegramPatchNoFields,
  telegramPatchSuccessResponse,
  telegramSettingsGetResponse,
  telegramUnknownAction,
  telegramVerifyResponse,
} from "../_shared/telegramSettingsHttp.ts";
import {
  jsonError,
  jsonResponse,
  readJsonBody,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("telegram-finance-settings", async (req) => {
  if (req.method === "GET") {
    return telegramSettingsGetResponse(
      req,
      ensureFinanceSettingsRow,
      () => DatabaseService.getTelegramFinanceSettings(),
      (row) =>
        serializeFinanceSettings(row as unknown as TelegramFinanceSettings),
    );
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    const patch: Record<string, unknown> = {};
    let slotParsed: { hour: number; minute: number } | undefined;

    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

    if (typeof body.defaultReminderTemplate === "string") {
      patch.default_reminder_template = sanitizeFinanceReminderTemplate(
        body.defaultReminderTemplate.slice(0, 8000),
      );
    }

    if (body.dailyCheckTimeManila !== undefined) {
      const s = body.dailyCheckTimeManila;
      if (
        s &&
        typeof s === "object" &&
        typeof s.hour === "number" &&
        typeof s.minute === "number"
      ) {
        const h = Math.max(0, Math.min(23, Math.round(s.hour)));
        const m = Math.max(0, Math.min(59, Math.round(s.minute)));
        slotParsed = { hour: h, minute: m };
        patch.daily_check_time_manila = slotParsed;
      } else {
        return jsonError(req, "dailyCheckTimeManila must be { hour, minute }");
      }
    }

    if (Object.keys(patch).length === 0) {
      return telegramPatchNoFields(req);
    }

    const updated = await DatabaseService.updateTelegramFinanceSettings(patch);
    const cronSync = slotParsed
      ? await DatabaseService.syncTelegramFinanceDailyCronJob(slotParsed)
      : undefined;

    return telegramPatchSuccessResponse(
      req,
      serializeFinanceSettings(updated as unknown as TelegramFinanceSettings),
      cronSync,
    );
  }

  if (req.method === "POST") {
    await ensureFinanceSettingsRow();
    const body = await readJsonBody(req);
    const action = parseAction(body);

    if (action === "verify_finance_telegram_env") {
      return telegramVerifyResponse(req, await verifyFinanceTelegramEnv());
    }

    if (action === "send_test_due_reminders") {
      return jsonResponse(req, {
        success: true,
        result: await runFinanceDueReminders({ force: true }),
      });
    }

    if (action === "send_draft_preview") {
      return handleTelegramSendDraftPreview(req, body, (text) =>
        sendFinanceDraftPreview(text),
      );
    }

    if (action === "render_draft_preview") {
      return handleTelegramRenderDraftPreview(req, body, (text) =>
        renderFinanceDraftPreview(text),
      );
    }

    return telegramUnknownAction(
      req,
      action,
      "Use verify_finance_telegram_env | send_test_due_reminders | send_draft_preview | render_draft_preview",
    );
  }

  throw new Error(`Method ${req.method} not allowed`);
});
