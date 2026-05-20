/**
 * list-bookings — Admin endpoint for paginated, filtered, sorted booking list.
 *
 * Replaces Phase 1's direct PostgREST access from the UI.  Handles:
 * - Free-text search (guest name / email)
 * - Status multi-filter
 * - Date-range filter on check_in_date (converted from MM-DD-YYYY for correct sort)
 * - has_pets / need_parking boolean filters
 * - Default sort: status_priority ASC (workflow order), then check-in proximity for review/docs
 * - Default filter: hide check-in before today (any status); `show_previous_bookings=true` to include
 *
 * Trigger:  GET /functions/v1/list-bookings
 * Auth:     verify_jwt = true (admin only)
 * Plan:     docs/NEW_FLOW_PLAN.md §3.3 + §6.1 Q5.1–Q5.2
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    const url = new URL(req.url);
    const p = url.searchParams;

    const q = p.get('q') ?? '';
    const statusRaw = p.getAll('status');
    const from = p.get('from') ?? null;
    const to = p.get('to') ?? null;
    const hasPets =
      p.get('has_pets') === 'true' ? true : p.get('has_pets') === 'false' ? false : null;
    const needParking =
      p.get('need_parking') === 'true' ? true : p.get('need_parking') === 'false' ? false : null;
    const showPreviousBookings =
      p.get('show_previous_bookings') === 'true' ||
      p.get('hide_stale_completed') === 'false'; // legacy alias
    const sort = (p.get('sort') ?? 'status_priority:asc') as
      | 'status_priority:asc'
      | 'check_in_date:asc'
      | 'check_in_date:desc'
      | 'created_at:asc'
      | 'created_at:desc';
    const page = Math.max(1, parseInt(p.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '25', 10)));

    const { rows, total } = await DatabaseService.listBookings({
      q,
      status: statusRaw,
      from,
      to,
      hasPets,
      needParking,
      sort,
      page,
      limit,
      showPreviousBookings,
    });

    return new Response(
      JSON.stringify({ success: true, data: rows, total, page, limit }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in list-bookings:', error);
    const status = error instanceof Response ? error.status : 400;
    const message = error instanceof Response
      ? await error.clone().json().then((b: any) => b.error).catch(() => 'Unauthorized')
      : (error as Error).message;

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
