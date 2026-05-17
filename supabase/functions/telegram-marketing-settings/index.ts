/**
 * telegram-marketing-settings — Admin GET/PATCH/POST for Telegram copy + toggles.
 * POST `action` = manual tests (verifyAdminJwt). Auth: verifyAdminJwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import {
  addDaysYmd,
  manilaTodayYmd,
} from '../_shared/calendarAvailabilityManila.ts';
import {
  applySamplePlaceholdersToTemplate,
  ensureTelegramSettingsRow,
  notifyTelegramCancellation,
  notifyTelegramNewBookingRequest,
  runTelegramDailyReminder,
  sendTelegramAdminPreview,
  serializeTelegramSettings,
  verifyTelegramEnv,
} from '../_shared/telegramMarketing.ts';
import { parseManilaReminderSlots, type ManilaReminderSlot } from '../_shared/telegramMarketingCronSync.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method === 'GET') {
      await ensureTelegramSettingsRow();
      const row = await DatabaseService.getTelegramMarketingSettings();
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: 'Settings row missing' }), {
          status: 500,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ success: true, data: serializeTelegramSettings(row as never) }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const patch: Record<string, unknown> = {};
      let slotsParsed: ManilaReminderSlot[] | undefined;

      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
      if (typeof body.notifyOnNewBooking === 'boolean') {
        patch.notify_on_new_booking = body.notifyOnNewBooking;
      }
      if (typeof body.notifyOnCancellation === 'boolean') {
        patch.notify_on_cancellation = body.notifyOnCancellation;
      }
      if (typeof body.urgencyDaysThreshold === 'number') {
        const n = Math.floor(body.urgencyDaysThreshold);
        if (n >= 1 && n <= 30) patch.urgency_days_threshold = n;
      }
      if (typeof body.newBookingDatesLimit === 'number') {
        const n = Math.floor(body.newBookingDatesLimit);
        if (n >= 1 && n <= 31) patch.new_booking_dates_limit = n;
      }
      if (typeof body.dailyDefaultTemplate === 'string') {
        patch.daily_default_template = body.dailyDefaultTemplate.slice(0, 4000);
      }
      if (typeof body.dailyUrgencyTemplate === 'string') {
        patch.daily_urgency_template = body.dailyUrgencyTemplate.slice(0, 4000);
      }
      if (typeof body.newBookingTemplate === 'string') {
        patch.new_booking_template = body.newBookingTemplate.slice(0, 4000);
      }
      if (typeof body.cancellationTemplate === 'string') {
        patch.cancellation_template = body.cancellationTemplate.slice(0, 4000);
      }

      if (body.dailyReminderTimesManila !== undefined) {
        try {
          slotsParsed = parseManilaReminderSlots(body.dailyReminderTimesManila);
        } catch (e) {
          return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
            status: 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
        patch.daily_reminder_times_manila = slotsParsed;
      }

      if (Object.keys(patch).length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'No valid fields to update' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      const updated = await DatabaseService.updateTelegramMarketingSettings(patch);
      let cronSync:
        | { ok: boolean; error?: string; scheduled?: number; jobNamePrefix?: string }
        | undefined;
      if (slotsParsed) {
        cronSync = await DatabaseService.syncTelegramMarketingDailyCronJobs(slotsParsed);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: serializeTelegramSettings(updated as never),
          ...(cronSync !== undefined ? { cronSync } : {}),
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (req.method === 'POST') {
      await ensureTelegramSettingsRow();
      const body = await req.json().catch(() => ({}));
      const action = typeof body.action === 'string' ? body.action : '';

      if (action === 'send_test_daily_reminder') {
        const result = await runTelegramDailyReminder({ force: true });
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'send_test_new_booking') {
        const result = await notifyTelegramNewBookingRequest({ force: true });
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'send_test_cancellation') {
        const todayYmd = manilaTodayYmd();
        let ci = typeof body.checkInYmd === 'string' ? body.checkInYmd.trim() : '';
        let co = typeof body.checkOutYmd === 'string' ? body.checkOutYmd.trim() : '';
        if ((ci && !co) || (!ci && co)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Provide both checkInYmd and checkOutYmd (YYYY-MM-DD), or leave both empty for the demo range.',
            }),
            { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
          );
        }
        if (!ci || !co) {
          ci = todayYmd;
          co = addDaysYmd(todayYmd, 2);
        }
        const result = await notifyTelegramCancellation(ci, co, { force: true });
        return new Response(JSON.stringify({ success: true, result, usedDates: { checkInYmd: ci, checkOutYmd: co } }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'verify_telegram_env') {
        const verify = await verifyTelegramEnv();
        return new Response(JSON.stringify({ success: true, verify }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'send_draft_with_sample_placeholders') {
        const text = typeof body.text === 'string' ? body.text : '';
        if (!text.trim()) {
          return new Response(JSON.stringify({ success: false, error: 'text is required' }), {
            status: 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
        const filled = applySamplePlaceholdersToTemplate(text.slice(0, 4000));
        const r = await sendTelegramAdminPreview(filled);
        return new Response(
          JSON.stringify({
            success: r.ok,
            sent: r.ok,
            error: r.error,
            messageCharCount: filled.length,
          }),
          {
            status: r.ok ? 200 : 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Unknown action: ${action || '(missing)'}. Use verify_telegram_env | send_test_daily_reminder | send_test_new_booking | send_test_cancellation | send_draft_with_sample_placeholders`,
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
    console.error('telegram-marketing-settings:', error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
