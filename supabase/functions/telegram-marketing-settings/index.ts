/**
 * telegram-marketing-settings — Admin GET/PATCH/POST for Telegram copy + toggles.
 * POST `action` = manual tests (verifyAdminJwt). Auth: verifyAdminJwt
 */

import { DatabaseService } from "../_shared/databaseService.ts";
import {
  ensureTelegramSettingsRow,
  prepareTelegramTemplateMessage,
  renderMarketingDraftPreview,
  sendTelegramAdminPreview,
  serializeTelegramSettings,
  TelegramTemplateError,
  verifyTelegramEnv,
} from "../_shared/telegramMarketing.ts";
import {
  parseManilaReminderSlots,
  type ManilaReminderSlot,
} from "../_shared/telegramMarketingCronSync.ts";
import {
  jsonError,
  jsonResponse,
  readJsonBody,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";
import {
  parseAction,
  parseDraftText,
  parseMarketingDraftDates,
  telegramPatchNoFields,
  telegramPatchSuccessResponse,
  telegramSettingsGetResponse,
  telegramUnknownAction,
  telegramVerifyResponse,
  templateErrorMessage,
} from "../_shared/telegramSettingsHttp.ts";

serveAdmin("telegram-marketing-settings", async (req) => {
  if (req.method === "GET") {
    return telegramSettingsGetResponse(
      req,
      ensureTelegramSettingsRow,
      () => DatabaseService.getTelegramMarketingSettings(),
      (row) => serializeTelegramSettings(row as never),
    );
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    const patch: Record<string, unknown> = {};
    let slotsParsed: ManilaReminderSlot[] | undefined;

    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.notifyOnNewBooking === "boolean") {
      patch.notify_on_new_booking = body.notifyOnNewBooking;
    }
    if (typeof body.notifyOnCancellation === "boolean") {
      patch.notify_on_cancellation = body.notifyOnCancellation;
    }
    if (typeof body.urgencyDaysThreshold === "number") {
      const n = Math.floor(body.urgencyDaysThreshold);
      if (n >= 1 && n <= 30) patch.urgency_days_threshold = n;
    }
    if (typeof body.newBookingDatesLimit === "number") {
      const n = Math.floor(body.newBookingDatesLimit);
      if (n >= 1 && n <= 31) patch.new_booking_dates_limit = n;
    }
    if (typeof body.dailyDefaultTemplate === "string") {
      patch.daily_default_template = body.dailyDefaultTemplate.slice(0, 4000);
    }
    if (typeof body.dailyUrgencyTemplate === "string") {
      patch.daily_urgency_template = body.dailyUrgencyTemplate.slice(0, 4000);
    }
    if (typeof body.newBookingTemplate === "string") {
      patch.new_booking_template = body.newBookingTemplate.slice(0, 4000);
    }
    if (typeof body.cancellationTemplate === "string") {
      patch.cancellation_template = body.cancellationTemplate.slice(0, 4000);
    }

    if (body.dailyReminderTimesManila !== undefined) {
      try {
        slotsParsed = parseManilaReminderSlots(body.dailyReminderTimesManila);
      } catch (e) {
        return jsonError(req, templateErrorMessage(e));
      }
      patch.daily_reminder_times_manila = slotsParsed;
    }

    if (Object.keys(patch).length === 0) {
      return telegramPatchNoFields(req);
    }

    const updated =
      await DatabaseService.updateTelegramMarketingSettings(patch);
    let cronSync:
      | {
          ok: boolean;
          error?: string;
          scheduled?: number;
          jobNamePrefix?: string;
        }
      | undefined;
    if (slotsParsed) {
      cronSync =
        await DatabaseService.syncTelegramMarketingDailyCronJobs(slotsParsed);
    }

    return telegramPatchSuccessResponse(
      req,
      serializeTelegramSettings(updated as never),
      cronSync,
    );
  }

  if (req.method === "POST") {
    await ensureTelegramSettingsRow();
    const body = await readJsonBody(req);
    const action = parseAction(body).trim();

    if (action === "verify_telegram_env") {
      return telegramVerifyResponse(req, await verifyTelegramEnv());
    }

    if (
      action === "send_draft_preview" ||
      action === "send_draft_with_sample_placeholders"
    ) {
      const text = parseDraftText(body, 4000);
      if (!text) return jsonError(req, "text is required");

      const row = await DatabaseService.getTelegramMarketingSettings();
      if (!row) return jsonError(req, "Settings row missing", 500);

      const dates = parseMarketingDraftDates(body);
      try {
        const filled = await prepareTelegramTemplateMessage(
          text,
          row as never,
          dates,
        );
        const r = await sendTelegramAdminPreview(filled);
        return jsonResponse(
          req,
          {
            success: r.ok,
            sent: r.ok,
            error: r.error,
            messageCharCount: filled.length,
          },
          r.ok ? 200 : 400,
        );
      } catch (e) {
        const message =
          e instanceof TelegramTemplateError || e instanceof Error
            ? e.message
            : String(e);
        return jsonError(req, message);
      }
    }

    if (action === "render_draft_preview") {
      const text = parseDraftText(body, 4000);
      if (!text) return jsonError(req, "text is required");

      const row = await DatabaseService.getTelegramMarketingSettings();
      if (!row) return jsonError(req, "Settings row missing", 500);

      const dates = parseMarketingDraftDates(body);
      try {
        const { renderedText, placeholders } =
          await renderMarketingDraftPreview(text, row as never, dates);
        return jsonResponse(req, { success: true, renderedText, placeholders });
      } catch (e) {
        const message =
          e instanceof TelegramTemplateError || e instanceof Error
            ? e.message
            : String(e);
        return jsonError(req, message);
      }
    }

    return telegramUnknownAction(
      req,
      action,
      "Use verify_telegram_env | send_draft_preview | render_draft_preview",
    );
  }

  return jsonError(req, `Method ${req.method} not allowed`, 405);
});
