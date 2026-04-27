/**
 * cancel-booking — Admin endpoint to cancel a booking.
 *
 * Delegates to workflowOrchestrator.transition(bookingId, 'CANCELLED') so that
 * Calendar (purple) and Sheet (Cancelled) updates are consistent with all other
 * transitions.
 *
 * Trigger:  POST /functions/v1/cancel-booking
 * Auth:     verify_jwt = true (admin only)
 * Plan:     docs/NEW_FLOW_PLAN.md §3.3, booking-workflow.mdc §4
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { WorkflowOrchestrator } from '../_shared/workflowOrchestrator.ts';
import { DatabaseService } from '../_shared/databaseService.ts';

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
    const { bookingId, confirm, devControls = {} } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking ID is required' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (confirm !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cancellation requires confirmation. Send { "confirm": true } in the request body.',
        }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    const booking = await DatabaseService.getBookingById(bookingId);
    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (booking.status === 'CANCELLED') {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking is already cancelled' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Cancelling booking: ${bookingId} (${booking.primary_guest_name})`);

    // Delegate entirely to the orchestrator — handles DB, Calendar (purple), and Sheet
    const result = await WorkflowOrchestrator.transition(
      bookingId,
      'CANCELLED',
      {},
      devControls,
      true,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking cancelled successfully. All data preserved; dates are now available.',
        bookingId,
        guestName: booking.primary_guest_name,
        data: result,
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error during booking cancellation:', error);
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
