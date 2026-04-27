/**
 * send-sd-refund-form-email — Admin-only: re-send the guest SD refund form email.
 *
 * POST { bookingId }
 * Status must be PENDING_SD_REFUND_DETAILS. Does not change status; updates sd_refund_form_emailed_at.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { sendSdRefundFormRequest } from '../_shared/emailService.ts';

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
    const bookingId = body?.bookingId as string | undefined;
    if (!bookingId || typeof bookingId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'bookingId (string) is required' }),
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

    if (booking.status !== 'PENDING_SD_REFUND_DETAILS') {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Booking must be in PENDING_SD_REFUND_DETAILS (current: ${booking.status})`,
        }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    const isTestBooking = booking.is_test_booking === true;
    const isProduction = !!Deno.env.get('DENO_DEPLOYMENT_ID');
    if (isProduction && isTestBooking) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'test_booking_in_production' }),
        { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    await sendSdRefundFormRequest(booking, isTestBooking);
    await DatabaseService.setWorkflowFields(bookingId, {
      sd_refund_form_emailed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, bookingId }),
      { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error('[send-sd-refund-form-email]', err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
