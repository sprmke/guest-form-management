/**
 * telegram-admin-settings — Admin GET/PATCH/POST for admin ops Telegram config.
 * POST `action` = manual tests (verifyAdminJwt). Auth: verifyAdminJwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import {
  ensureAdminSettingsRow,
  renderAdminDraftPreview,
  sendAdminDraftPreview,
  serializeAdminSettings,
  verifyAdminTelegramEnv,
  type AdminHourlyNotificationType,
  type TelegramAdminSettings,
} from '../_shared/telegramAdmin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method === 'GET') {
      await ensureAdminSettingsRow();
      const row = await DatabaseService.getTelegramAdminSettings();
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: 'Settings row missing' }), {
          status: 500,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: serializeAdminSettings(row as unknown as TelegramAdminSettings),
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const patch: Record<string, unknown> = {};
      let syncCron = false;

      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
      if (typeof body.notifyOnNewBooking === 'boolean') {
        patch.notify_on_new_booking = body.notifyOnNewBooking;
        syncCron = true;
      }
      if (typeof body.notifyOnSdFormSubmitted === 'boolean') {
        patch.notify_on_sd_form_submitted = body.notifyOnSdFormSubmitted;
      }
      if (typeof body.notifyPendingDocsHourly === 'boolean') {
        patch.notify_pending_docs_hourly = body.notifyPendingDocsHourly;
        syncCron = true;
      }
      if (typeof body.notifyBalanceReceiptHourly === 'boolean') {
        patch.notify_balance_receipt_hourly = body.notifyBalanceReceiptHourly;
        syncCron = true;
      }
      if (typeof body.notifySdRefundPendingHourly === 'boolean') {
        patch.notify_sd_refund_pending_hourly = body.notifySdRefundPendingHourly;
        syncCron = true;
      }

      const templateMap: Record<string, string> = {
        newBookingTemplate: 'new_booking_template',
        pendingDocsTemplate: 'pending_docs_template',
        balanceReceiptTemplate: 'balance_receipt_template',
        sdFormSubmittedTemplate: 'sd_form_submitted_template',
        sdRefundPendingTemplate: 'sd_refund_pending_template',
      };
      for (const [bodyKey, dbKey] of Object.entries(templateMap)) {
        if (typeof body[bodyKey] === 'string') {
          patch[dbKey] = (body[bodyKey] as string).slice(0, 8000);
        }
      }

      if (body.resyncHourlyCron === true) syncCron = true;

      if (Object.keys(patch).length === 0 && !syncCron) {
        return new Response(JSON.stringify({ success: false, error: 'No valid fields to update' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      let updated: Record<string, unknown>;
      if (Object.keys(patch).length > 0) {
        updated = await DatabaseService.updateTelegramAdminSettings(patch);
      } else {
        await ensureAdminSettingsRow();
        updated = (await DatabaseService.getTelegramAdminSettings()) ?? {};
      }

      let cronSync: { ok?: boolean; error?: string; cronExpr?: string } | undefined;
      if (syncCron) {
        cronSync = await DatabaseService.syncTelegramAdminHourlyCronJob();
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: serializeAdminSettings(updated as unknown as TelegramAdminSettings),
          ...(cronSync !== undefined ? { cronSync } : {}),
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (req.method === 'POST') {
      await ensureAdminSettingsRow();
      const body = await req.json().catch(() => ({}));
      const action = typeof body.action === 'string' ? body.action : '';

      if (action === 'verify_admin_telegram_env') {
        const verify = await verifyAdminTelegramEnv();
        return new Response(JSON.stringify({ success: true, verify }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      if (action === 'send_draft_preview') {
        const text = typeof body.text === 'string' ? body.text : '';
        const scenario = typeof body.scenario === 'string' ? body.scenario : '';
        const allowed = [
          'new_booking',
          'pending_docs',
          'balance_receipt',
          'sd_form_submitted',
          'sd_refund_pending',
        ];
        if (!text.trim() || !allowed.includes(scenario)) {
          return new Response(
            JSON.stringify({ success: false, error: 'text and valid scenario are required' }),
            {
              status: 400,
              headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
            },
          );
        }
        const preview = await sendAdminDraftPreview(
          text.slice(0, 8000),
          scenario as AdminHourlyNotificationType | 'new_booking' | 'sd_form_submitted',
        );
        return new Response(
          JSON.stringify({
            success: preview.sent,
            sent: preview.sent,
            error: preview.error,
            messageCharCount: preview.messageCharCount,
            previewGuestName: preview.previewGuestName,
          }),
          {
            status: preview.sent ? 200 : 400,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          },
        );
      }

      if (action === 'render_draft_preview') {
        const text = typeof body.text === 'string' ? body.text : '';
        const scenario = typeof body.scenario === 'string' ? body.scenario : '';
        const allowed = [
          'new_booking',
          'pending_docs',
          'balance_receipt',
          'sd_form_submitted',
          'sd_refund_pending',
        ];
        if (!text.trim() || !allowed.includes(scenario)) {
          return new Response(
            JSON.stringify({ success: false, error: 'text and valid scenario are required' }),
            {
              status: 400,
              headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
            },
          );
        }
        const rendered = await renderAdminDraftPreview(
          text.slice(0, 8000),
          scenario as AdminHourlyNotificationType | 'new_booking' | 'sd_form_submitted',
        );
        if (rendered.error || !rendered.renderedText) {
          return new Response(
            JSON.stringify({ success: false, error: rendered.error ?? 'render_failed' }),
            {
              status: 400,
              headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
            },
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            renderedText: rendered.renderedText,
            placeholders: rendered.placeholders,
            previewGuestName: rendered.previewGuestName,
          }),
          { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error:
            `Unknown action: ${action || '(missing)'}. Use verify_admin_telegram_env | send_draft_preview | render_draft_preview`,
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
    console.error('telegram-admin-settings:', error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
