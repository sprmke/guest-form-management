/**
 * telegram-staff-cron — Daily (default 8:00 Manila) via pg_cron + pg_net.
 * Sends active today's booking summary (check-ins, in-house multi-night stays, check-outs)
 * + next 3 days' upcoming check-ins to staff/cleaner Telegram group.
 *
 * Auth: verify_jwt = false. If TELEGRAM_STAFF_CRON_SECRET is set, require header
 *       X-Telegram-Cron-Secret matching that value.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { runStaffDailySummary, verifyStaffCronSecret } from '../_shared/telegramStaff.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    if (!verifyStaffCronSecret(req)) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const result = await runStaffDailySummary();
    console.log('[telegram-staff-cron]', JSON.stringify(result));
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('telegram-staff-cron:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});
