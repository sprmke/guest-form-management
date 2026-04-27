/**
 * parking-broadcast-email — admin edge function.
 *
 * Purpose: Manually (re-)send the parking availability broadcast BCC email to all
 *          addresses in PARKING_OWNER_EMAILS. Useful when:
 *            • The automatic broadcast (fired by the orchestrator at PENDING_REVIEW → PENDING_GAF)
 *              failed or was skipped.
 *            • The admin wants to re-broadcast after parking owner details change.
 *
 * Auth:    Admin JWT required (verifyAdminJwt).
 * Method:  POST
 * Body:    { bookingId: string }
 *
 * Reference:  docs/NEW_FLOW_PLAN.md §3.3, §3.5
 *             .cursor/rules/booking-workflow.mdc §3
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { sendParkingBroadcast } from '../_shared/emailService.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    // ── 1. Admin auth ──────────────────────────────────────────────────────────
    await verifyAdminJwt(req);

    // ── 2. Parse + validate body ───────────────────────────────────────────────
    let bookingId: string | undefined;
    try {
      const body = await req.json();
      bookingId = body?.bookingId;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (!bookingId || typeof bookingId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'bookingId (string) is required' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. Load booking ────────────────────────────────────────────────────────
    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: booking, error: fetchError } = await sb
      .from('guest_submissions')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError) {
      console.error('[parking-broadcast-email] DB error:', fetchError.message);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: `Booking ${bookingId} not found` }),
        { status: 404, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // ── 4. Guard: booking must require parking ─────────────────────────────────
    if (!booking.need_parking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking does not require parking — broadcast skipped' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // ── 5. Guard: no real emails for test bookings in production ──────────────
    const isTestBooking = booking.is_test_booking === true;
    const isProduction = !!Deno.env.get('DENO_DEPLOYMENT_ID');

    if (isProduction && isTestBooking) {
      console.log('[parking-broadcast-email] Suppressed: test booking in production');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'test_booking_in_production' }),
        { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // ── 6. Send broadcast ──────────────────────────────────────────────────────
    console.log(`[parking-broadcast-email] Sending broadcast for booking ${bookingId}...`);
    const result = await sendParkingBroadcast(booking, isTestBooking);

    if (result === null) {
      // sendParkingBroadcast returns null when PARKING_OWNER_EMAILS is not set
      return new Response(
        JSON.stringify({ success: false, error: 'PARKING_OWNER_EMAILS is not configured' }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[parking-broadcast-email] Broadcast sent successfully for booking ${bookingId}`);

    return new Response(
      JSON.stringify({ success: true, bookingId, result }),
      { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    // verifyAdminJwt throws a Response on auth failure
    if (err instanceof Response) return err;

    console.error('[parking-broadcast-email] Fatal error:', err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
