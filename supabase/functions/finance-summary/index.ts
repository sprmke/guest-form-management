/**
 * finance-summary — Admin KPI aggregates for the finance dashboard.
 * GET ?basis=check_in|check_out|completed&from=&to=&include_cancelled=&completed_only=&q=
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { computeFinanceSummary } from '../_shared/financeService.ts';
import type { FinancePeriodBasis } from '../_shared/financePeriodFilter.ts';

function parseBasis(raw: string | null): FinancePeriodBasis {
  if (raw === 'check_out' || raw === 'completed') return raw;
  return 'check_in';
}

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
    const p = url.searchParams;
    const data = await computeFinanceSummary({
      from: p.get('from'),
      to: p.get('to'),
      basis: parseBasis(p.get('basis')),
      includeCancelled: p.get('include_cancelled') === 'true',
      completedOnly: p.get('completed_only') === 'true',
      q: p.get('q') ?? undefined,
    });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in finance-summary:', error);
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
