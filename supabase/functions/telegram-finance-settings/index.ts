/**
 * telegram-finance-settings — Admin GET/PATCH/POST for finance Telegram config.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import {
  ensureFinanceSettingsRow,
  parseFinanceSlot,
  runFinanceDueReminders,
  sanitizeFinanceReminderTemplate,
  sendFinanceDraftPreview,
  serializeFinanceSettings,
  verifyFinanceTelegramEnv,
  type TelegramFinanceSettings,
} from '../_shared/telegramFinance.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method === 'GET') {
      await ensureFinanceSettingsRow();
      const row = await DatabaseService.getTelegramFinanceSettings();
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: 'Settings row missing' }), {
          status: 500,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: serializeFinanceSettings(row as unknown as TelegramFinanceSettings),
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const patch: Record<string, unknown> = {};
      let slotParsed: { hour: number; minute: number } | undefined;

      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;

      if (typeof body.defaultReminderTemplate === 'string') {
        patch.default_reminder_template = sanitizeFinanceReminderTemplate(
          body.defaultReminderTemplate.slice(0, 8000),
        );
      }

      if (body.dailyCheckTimeManila !== undefined) {
        const s = body.dailyCheckTimeManila;
        if (s && typeof s === 'object' && typeof s.hour === 'number' && typeof s.minute === 'number') {
          const h = Math.max(0, Math.min(23, Math.round(s.hour)));
          const m = Math.max(0, Math.min(59, Math.round(s.minute)));
          slotParsed = { hour: h, minute: m };
          patch.daily_check_time_manila = slotParsed;
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'dailyCheckTimeManila must be { hour, minute }' }),
            { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
          );
        }
      }

      if (Object.keys(patch).length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'No valid fields to update' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      const updated = await DatabaseService.updateTelegramFinanceSettings(patch);
      let cronSync: { ok?: boolean; error?: string; cronExpr?: string } | undefined;
      if (slotParsed) {
        cronSync = await DatabaseService.syncTelegramFinanceDailyCronJob(slotParsed);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: serializeFinanceSettings(updated as unknown as TelegramFinanceSettings),
          ...(cronSync !== undefined ? { cronSync } : {}),
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (req.method === 'POST') {
      await ensureFinanceSettingsRow();
      const body = await req.json().catch(() => ({}));
      const action = typeof body.action === 'string' ? body.action : '';

      if (action === 'verify_finance_telegram_env') {
        const verify = await verifyFinanceTelegramEnv();
        return new Response(JSON.stringify({ success: true, verify }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'send_test_due_reminders') {
        const result = await runFinanceDueReminders({ force: true });
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'send_draft_preview') {
        const text = typeof body.text === 'string' ? body.text : '';
        if (!text.trim()) {
          return new Response(JSON.stringify({ success: false, error: 'text is required' }), {
            status: 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
        const preview = await sendFinanceDraftPreview(text.slice(0, 8000));
        return new Response(
          JSON.stringify({
            success: preview.sent,
            sent: preview.sent,
            error: preview.error,
            messageCharCount: preview.messageCharCount,
          }),
          {
            status: preview.sent ? 200 : 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error:
            `Unknown action: ${action || '(missing)'}. Use verify_finance_telegram_env | send_test_due_reminders | send_draft_preview`,
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
    console.error('telegram-finance-settings:', error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
