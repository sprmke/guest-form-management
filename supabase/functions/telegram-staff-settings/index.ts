/**
 * telegram-staff-settings — Admin GET/PATCH/POST for staff Telegram config.
 */

import { DatabaseService } from "../_shared/databaseService.ts";
import {
  ensureStaffSettingsRow,
  renderStaffDraftPreview,
  renderStaffNoBookingsDraftPreview,
  renderStaffSameDayCheckinDraftPreview,
  sanitizeStaffDailySummaryTemplate,
  sendStaffDraftPreview,
  sendStaffNoBookingsDraftPreview,
  sendStaffSameDayCheckinDraftPreview,
  serializeStaffSettings,
  verifyStaffTelegramEnv,
  type TelegramStaffSettings,
} from "../_shared/telegramStaff.ts";
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
import { jsonError, readJsonBody } from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

function staffDraftByScenario<T>(
  scenario: string,
  text: string,
  handlers: {
    sameDayCheckin: (text: string) => Promise<T>;
    noBookings: (text: string) => Promise<T>;
    default: (text: string) => Promise<T>;
  },
): Promise<T> {
  if (scenario === "same_day_checkin") return handlers.sameDayCheckin(text);
  if (scenario === "daily_summary_no_bookings")
    return handlers.noBookings(text);
  return handlers.default(text);
}

serveAdmin("telegram-staff-settings", async (req) => {
  if (req.method === "GET") {
    return telegramSettingsGetResponse(
      req,
      ensureStaffSettingsRow,
      () => DatabaseService.getTelegramStaffSettings(),
      (row) => serializeStaffSettings(row as unknown as TelegramStaffSettings),
    );
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    const patch: Record<string, unknown> = {};
    let slotParsed: { hour: number; minute: number } | undefined;

    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.notifyOnSameDayCheckin === "boolean") {
      patch.notify_on_same_day_checkin = body.notifyOnSameDayCheckin;
    }

    if (typeof body.dailySummaryTemplate === "string") {
      patch.daily_summary_template = sanitizeStaffDailySummaryTemplate(
        body.dailySummaryTemplate.slice(0, 8000),
      );
    }

    if (typeof body.dailySummaryNoBookingsTemplate === "string") {
      patch.daily_summary_no_bookings_template =
        sanitizeStaffDailySummaryTemplate(
          body.dailySummaryNoBookingsTemplate.slice(0, 8000),
        );
    }

    if (typeof body.sameDayCheckinTemplate === "string") {
      patch.same_day_checkin_template = sanitizeStaffDailySummaryTemplate(
        body.sameDayCheckinTemplate.slice(0, 8000),
      );
    }

    if (body.dailySummaryTimeManila !== undefined) {
      const s = body.dailySummaryTimeManila;
      if (
        s &&
        typeof s === "object" &&
        typeof s.hour === "number" &&
        typeof s.minute === "number"
      ) {
        const h = Math.max(0, Math.min(23, Math.round(s.hour)));
        const m = Math.max(0, Math.min(59, Math.round(s.minute)));
        slotParsed = { hour: h, minute: m };
        patch.daily_summary_time_manila = slotParsed;
      } else {
        return jsonError(
          req,
          "dailySummaryTimeManila must be { hour, minute }",
        );
      }
    }

    if (Object.keys(patch).length === 0) {
      return telegramPatchNoFields(req);
    }

    const updated = await DatabaseService.updateTelegramStaffSettings(patch);
    const cronSync = slotParsed
      ? await DatabaseService.syncTelegramStaffDailyCronJob(slotParsed)
      : undefined;

    return telegramPatchSuccessResponse(
      req,
      serializeStaffSettings(updated as unknown as TelegramStaffSettings),
      cronSync,
    );
  }

  if (req.method === "POST") {
    await ensureStaffSettingsRow();
    const body = await readJsonBody(req);
    const action = parseAction(body);

    if (action === "verify_staff_telegram_env") {
      return telegramVerifyResponse(req, await verifyStaffTelegramEnv());
    }

    if (action === "send_draft_preview") {
      return handleTelegramSendDraftPreview(
        req,
        body,
        (text, scenario) =>
          staffDraftByScenario(scenario, text, {
            sameDayCheckin: (t) => sendStaffSameDayCheckinDraftPreview(t),
            noBookings: (t) => sendStaffNoBookingsDraftPreview(t),
            default: (t) => sendStaffDraftPreview(t),
          }),
        { defaultScenario: "daily_summary" },
      );
    }

    if (action === "render_draft_preview") {
      return handleTelegramRenderDraftPreview(
        req,
        body,
        (text, scenario) =>
          staffDraftByScenario(scenario, text, {
            sameDayCheckin: (t) => renderStaffSameDayCheckinDraftPreview(t),
            noBookings: (t) => renderStaffNoBookingsDraftPreview(t),
            default: (t) => renderStaffDraftPreview(t),
          }),
        { defaultScenario: "daily_summary" },
      );
    }

    return telegramUnknownAction(
      req,
      action,
      "Use verify_staff_telegram_env | send_draft_preview | render_draft_preview",
    );
  }

  throw new Error(`Method ${req.method} not allowed`);
});
