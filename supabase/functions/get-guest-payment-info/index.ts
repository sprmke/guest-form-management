/**
 * get-guest-payment-info — Public GET for GCash + GAF defaults on the guest form.
 * Trigger: guest SPA on load (Payment step + submit). Auth: anon key only (verify_jwt = false).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { serializeGuestPaymentInfo } from '../_shared/appSettings.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'GET') {
      return jsonError(req, 405, `Method ${req.method} not allowed`);
    }

    const data = await serializeGuestPaymentInfo();
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-guest-payment-info]', error);
    return jsonError(req, 400, (error as Error).message);
  }
});

function jsonError(req: Request, status: number, error: string): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}
