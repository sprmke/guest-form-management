/**
 * dashboard-stats — Admin home dashboard aggregates.
 * GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — chart range (same params as /bookings, /finance).
 * Auth: verifyAdminJwt (verify_jwt = false in config.toml).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { computeDashboardStats } from '../_shared/dashboardService.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const data = await computeDashboardStats({ from, to });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in dashboard-stats:', error);
    const status = error instanceof Response ? error.status : 400;
    const message = error instanceof Response
      ? await error.clone().json().then((b: { error?: string }) => b.error).catch(() => 'Unauthorized')
      : (error as Error).message;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
