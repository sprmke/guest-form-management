/**
 * telegram-maintenance-settings — Admin GET/PATCH/POST for maintenance Telegram config.
 */

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
import { jsonResponse, readJsonBody } from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("telegram-maintenance-settings", async (req) => {
  if (req.method === "GET") {
    return telegramSettingsGetResponse(
      req,
      ensureMaintenanceSettingsRow,
      () => DatabaseService.getTelegramMaintenanceSettings(),
      (row) =>
        serializeMaintenanceSettings(
          row as unknown as TelegramMaintenanceSettings,
        ),
    );
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    const patch: Record<string, unknown> = {};

    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

    if (typeof body.defaultReminderTemplate === "string") {
      patch.default_reminder_template = sanitizeMaintenanceReminderTemplate(
        body.defaultReminderTemplate.slice(0, 8000),
      );
    }

    if (Object.keys(patch).length === 0) {
      return telegramPatchNoFields(req);
    }

    const updated =
      await DatabaseService.updateTelegramMaintenanceSettings(patch);
    const cronSync =
      await DatabaseService.syncTelegramMaintenanceHourlyCronJob();

    return telegramPatchSuccessResponse(
      req,
      serializeMaintenanceSettings(
        updated as unknown as TelegramMaintenanceSettings,
      ),
      cronSync,
    );
  }

  if (req.method === "POST") {
    await ensureMaintenanceSettingsRow();
    const body = await readJsonBody(req);
    const action = parseAction(body);

    if (action === "verify_maintenance_telegram_env") {
      return telegramVerifyResponse(req, await verifyMaintenanceTelegramEnv());
    }

    if (action === "send_test_due_reminders") {
      return jsonResponse(req, {
        success: true,
        result: await runMaintenanceDueReminders({ force: true }),
      });
    }

    if (action === "send_draft_preview") {
      return handleTelegramSendDraftPreview(req, body, (text) =>
        sendMaintenanceDraftPreview(text),
      );
    }

    if (action === "render_draft_preview") {
      return handleTelegramRenderDraftPreview(req, body, (text) =>
        renderMaintenanceDraftPreview(text),
      );
    }

    return telegramUnknownAction(
      req,
      action,
      "Use verify_maintenance_telegram_env | send_test_due_reminders | send_draft_preview | render_draft_preview",
    );
  }

  throw new Error(`Method ${req.method} not allowed`);
});
