/**
 * telegram-staff-settings — Admin GET/PATCH/POST for staff Telegram config.
 * POST `action` = manual tests (verifyAdminJwt). Auth: verifyAdminJwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import {
  bookingQualifiesForSameDayCheckinStaffAlert,
  ensureStaffSettingsRow,
  notifyTelegramStaffSameDayCheckIn,
  queryTodayBookings,
  runStaffDailySummary,
  sanitizeStaffDailySummaryTemplate,
  sendStaffDraftPreview,
  sendStaffSameDayCheckinDraftPreview,
  serializeStaffSettings,
  verifyStaffTelegramEnv,
  type TelegramStaffSettings,
} from '../_shared/telegramStaff.ts';
import { manilaTodayYmd } from '../_shared/calendarAvailabilityManila.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method === 'GET') {
      await ensureStaffSettingsRow();
      const row = await DatabaseService.getTelegramStaffSettings();
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: 'Settings row missing' }), {
          status: 500,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ success: true, data: serializeStaffSettings(row as unknown as TelegramStaffSettings) }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const patch: Record<string, unknown> = {};
      let slotParsed: { hour: number; minute: number } | undefined;

      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
      if (typeof body.notifyOnSameDayCheckin === 'boolean') {
        patch.notify_on_same_day_checkin = body.notifyOnSameDayCheckin;
      }

      if (typeof body.dailySummaryTemplate === 'string') {
        patch.daily_summary_template = sanitizeStaffDailySummaryTemplate(
          body.dailySummaryTemplate.slice(0, 8000),
        );
      }

      if (typeof body.sameDayCheckinTemplate === 'string') {
        patch.same_day_checkin_template = sanitizeStaffDailySummaryTemplate(
          body.sameDayCheckinTemplate.slice(0, 8000),
        );
      }

      if (body.dailySummaryTimeManila !== undefined) {
        const s = body.dailySummaryTimeManila;
        if (s && typeof s === 'object' && typeof s.hour === 'number' && typeof s.minute === 'number') {
          const h = Math.max(0, Math.min(23, Math.round(s.hour)));
          const m = Math.max(0, Math.min(59, Math.round(s.minute)));
          slotParsed = { hour: h, minute: m };
          patch.daily_summary_time_manila = slotParsed;
        } else {
          return new Response(JSON.stringify({ success: false, error: 'dailySummaryTimeManila must be { hour, minute }' }), {
            status: 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
      }

      if (Object.keys(patch).length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'No valid fields to update' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      const updated = await DatabaseService.updateTelegramStaffSettings(patch);
      let cronSync: { ok?: boolean; error?: string; cronExpr?: string } | undefined;
      if (slotParsed) {
        cronSync = await DatabaseService.syncTelegramStaffDailyCronJob(slotParsed);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: serializeStaffSettings(updated as unknown as TelegramStaffSettings),
          ...(cronSync !== undefined ? { cronSync } : {}),
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (req.method === 'POST') {
      await ensureStaffSettingsRow();
      const body = await req.json().catch(() => ({}));
      const action = typeof body.action === 'string' ? body.action : '';

      if (action === 'send_test_daily_summary') {
        const result = await runStaffDailySummary({ force: true });
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'verify_staff_telegram_env') {
        const verify = await verifyStaffTelegramEnv();
        return new Response(JSON.stringify({ success: true, verify }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'send_draft_preview') {
        const text = typeof body.text === 'string' ? body.text : '';
        const scenario =
          typeof body.scenario === 'string' ? body.scenario : 'daily_summary';
        if (!text.trim()) {
          return new Response(JSON.stringify({ success: false, error: 'text is required' }), {
            status: 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
        const preview =
          scenario === 'same_day_checkin'
            ? await sendStaffSameDayCheckinDraftPreview(text.slice(0, 8000))
            : await sendStaffDraftPreview(text.slice(0, 8000));
        return new Response(
          JSON.stringify({
            success: preview.sent,
            sent: preview.sent,
            error: preview.error,
            messageCharCount: preview.messageCharCount,
            previewGuestName: preview.previewGuestName,
            todayBookingCount: preview.todayBookingCount,
          }),
          {
            status: preview.sent ? 200 : 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          },
        );
      }

      if (action === 'send_test_same_day_checkin') {
        const bookingId = String(body.bookingId ?? '').trim();
        let row: Record<string, unknown> | null = null;
        if (bookingId) {
          row = await DatabaseService.getBookingById(bookingId);
          if (!row) {
            return new Response(JSON.stringify({ success: false, error: 'bookingId not found' }), {
              status: 404,
              headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
            });
          }
        } else {
          const today = await queryTodayBookings(manilaTodayYmd());
          row =
            today.find((b) => bookingQualifiesForSameDayCheckinStaffAlert(b)) ??
            today[0] ??
            null;
          if (!row) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'No booking checking in today for test send',
              }),
              {
                status: 404,
                headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
              },
            );
          }
        }
        const result = await notifyTelegramStaffSameDayCheckIn(row, { force: true });
        return new Response(JSON.stringify({ success: result.sent, result }), {
          status: result.sent ? 200 : 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          success: false,
          error:
            `Unknown action: ${action || '(missing)'}. Use verify_staff_telegram_env | send_test_daily_summary | send_test_same_day_checkin | send_draft_preview`,
        }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    throw new Error(`Method ${req.method} not allowed`);
  } catch (error) {
    const status = error instanceof Response ? error.status : 400;
    const message = error instanceof Response
      ? await error.clone().json().then((b: { error?: string }) => b.error).catch(() => 'Error')
      : (error as Error).message;
    console.error('telegram-staff-settings:', error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
