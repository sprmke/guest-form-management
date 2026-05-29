/**
 * telegram-admin-cron — Hourly via pg_cron + pg_net.
 * Evaluates pending docs, balance receipt, and SD refund scenarios dynamically.
 *
 * Auth: verify_jwt = false. If TELEGRAM_ADMIN_CRON_SECRET is set, require header
 *       X-Telegram-Cron-Secret matching that value.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { runAdminHourlyAlerts, verifyAdminCronSecret } from '../_shared/telegramAdmin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    if (!verifyAdminCronSecret(req)) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const result = await runAdminHourlyAlerts();
    console.log('[telegram-admin-cron]', JSON.stringify(result));
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('telegram-admin-cron:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});
