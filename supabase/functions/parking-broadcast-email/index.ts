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
 * Reference:  docs/planning/NEW_FLOW_PLAN.md §3.3, §3.5
 *             .cursor/rules/booking-workflow.mdc §3
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { sendParkingBroadcast } from '../_shared/emailService.ts';
import { rawPropertyAutomationEnabled } from '../_shared/propertyAutomationToggles.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    // ── 1. Parse + validate body ───────────────────────────────────────────────
    let bookingId: string | undefined;
    try {
      const body = await req.json();
      bookingId = body?.bookingId;
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (!bookingId || typeof bookingId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'bookingId (string) is required' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Load booking ────────────────────────────────────────────────────────
    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: booking, error: fetchError } = await sb
      .from('guest_submissions')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError) {
      console.error('[parking-broadcast-email] DB error:', fetchError.message);
      return new Response(JSON.stringify({ success: false, error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: `Booking ${bookingId} not found` }),
        { status: 404, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const bookingPropertyId =
      typeof booking.property_id === 'string' ? booking.property_id.trim() : '';
    if (!bookingPropertyId) {
      return new Response(JSON.stringify({ success: false, error: 'Booking has no property_id' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    await resolveScopedPropertyAccess(req, 'bookings:workflow', bookingPropertyId);

    // ── 4. Guard: booking must require parking ─────────────────────────────────
    if (!booking.need_parking) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Booking does not require parking — broadcast skipped',
        }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. Send broadcast ──────────────────────────────────────────────────────
    const propertyId = bookingPropertyId;
    const broadcastAllowed = propertyId
      ? await rawPropertyAutomationEnabled(propertyId, 'emailParkingBroadcast')
      : true;
    if (!broadcastAllowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Parking broadcast emails are disabled in organization automations',
        }),
        { status: 409, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[parking-broadcast-email] Sending broadcast for booking ${bookingId}...`);
    const result = await sendParkingBroadcast(booking);

    if (result === null) {
      // sendParkingBroadcast returns null when PARKING_OWNER_EMAILS is not set
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Parking owner emails are not configured (Settings or PARKING_OWNER_EMAILS)',
        }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[parking-broadcast-email] Broadcast sent successfully for booking ${bookingId}`);

    return new Response(JSON.stringify({ success: true, bookingId, result }), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;

    const message = err instanceof Error ? err.message : String(err);
    console.error('[parking-broadcast-email] Fatal error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
