/**
 * telegram-marketing-cron — 3× daily (Manila 10:00, 15:00, 21:00) via pg_cron + pg_net.
 * Sends default or urgency marketing copy to Telegram.
 *
 * Auth: verify_jwt = false. If TELEGRAM_CRON_SECRET is set, require header
 *       X-Telegram-Cron-Secret matching that value.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { runTelegramDailyReminder, verifyTelegramCronSecret } from '../_shared/telegramMarketing.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    if (!verifyTelegramCronSecret(req)) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const result = await runTelegramDailyReminder();
    console.log('[telegram-marketing-cron]', JSON.stringify(result));
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('telegram-marketing-cron:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});
