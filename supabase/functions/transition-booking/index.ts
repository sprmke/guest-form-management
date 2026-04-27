/**
 * transition-booking — Admin endpoint to advance a booking through the workflow.
 *
 * Validates the requested transition against the state machine, then delegates
 * ALL side effects (DB, Calendar, Sheet, Emails) to workflowOrchestrator.transition().
 *
 * Request body:
 * {
 *   bookingId:   string,
 *   toStatus:    BookingStatus,
 *   payload?:    TransitionPayload,   // pricing, parking, SD refund fields
 *   devControls?: DevControlFlags,    // admin checkbox overrides
 *   manual?:     boolean              // default true for UI-triggered transitions
 * }
 *
 * Trigger:  POST /functions/v1/transition-booking
 * Auth:     verify_jwt = true (admin only)
 * Plan:     docs/NEW_FLOW_PLAN.md §3.3, booking-workflow.mdc §2
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { isBookingStatus } from '../_shared/statusMachine.ts';
import { WorkflowOrchestrator } from '../_shared/workflowOrchestrator.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = await req.json().catch(() => ({}));
    const { bookingId, toStatus, payload = {}, devControls = {}, manual = true } = body;

    if (!bookingId) throw new Error('bookingId is required');
    if (!toStatus) throw new Error('toStatus is required');
    if (!isBookingStatus(toStatus)) {
      throw new Error(`Invalid toStatus: "${toStatus}"`);
    }

    console.log(`[transition-booking] ${bookingId} → ${toStatus} (manual=${manual})`);

    const result = await WorkflowOrchestrator.transition(
      bookingId,
      toStatus,
      payload,
      devControls,
      manual,
    );

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in transition-booking:', error);
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
