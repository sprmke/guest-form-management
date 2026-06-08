/**
 * finance-bookings — Paginated stays ledger with computed financial columns.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { listFinanceBookings } from '../_shared/financeService.ts';
import type { FinancePeriodBasis } from '../_shared/financePeriodFilter.ts';

function parseBasis(raw: string | null): FinancePeriodBasis {
  if (raw === 'check_out' || raw === 'completed') return raw;
  return 'check_in';
}

function parseSort(raw: string | null) {
  const allowed = [
    'check_in_date:asc',
    'check_in_date:desc',
    'host_net:desc',
    'host_net:asc',
  ] as const;
  if (allowed.includes(raw as (typeof allowed)[number])) {
    return raw as (typeof allowed)[number];
  }
  return 'check_in_date:desc' as const;
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
    const page = Math.max(1, parseInt(p.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '31', 10)));

    const { rows, total } = await listFinanceBookings({
      from: p.get('from'),
      to: p.get('to'),
      basis: parseBasis(p.get('basis')),
      includeCancelled: p.get('include_cancelled') === 'true',
      completedOnly: p.get('completed_only') === 'true',
      q: p.get('q') ?? undefined,
      page,
      limit,
      sort: parseSort(p.get('sort')),
    });

    return new Response(
      JSON.stringify({ success: true, data: rows, total, page, limit }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in finance-bookings:', error);
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
