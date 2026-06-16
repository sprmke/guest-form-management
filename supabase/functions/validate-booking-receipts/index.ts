/**
 * validate-booking-receipts — Admin one-shot AI backfill for payment receipts.
 *
 * When a booking already has receipt image URLs but no persisted AI verdict
 * (e.g. legacy rows before validation shipped), download each image from
 * Storage and run Gemini once. Skips COMPLETED / CANCELLED bookings.
 *
 * Trigger: POST /functions/v1/validate-booking-receipts
 * Body:    { bookingId: string }
 * Auth:    verifyAdminJwt(req)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import {
  backfillMissingReceiptAiVerdicts,
  dbPatchFromReceiptBackfillItems,
} from '../_shared/receiptValidationService.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = await req.json() as { bookingId?: string };
    const bookingId = String(body.bookingId ?? '').trim();
    if (!bookingId) throw new Error('bookingId is required');

    const booking = await DatabaseService.getBookingById(bookingId);
    if (!booking) throw new Error(`Booking not found: ${bookingId}`);

    const validated = await backfillMissingReceiptAiVerdicts(
      booking as Record<string, unknown>,
    );

    if (validated.length > 0) {
      await DatabaseService.setWorkflowFields(
        bookingId,
        dbPatchFromReceiptBackfillItems(validated),
      );
      console.log(
        `[validate-booking-receipts] ${bookingId}: validated ${validated.length} receipt(s)`,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { validated },
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in validate-booking-receipts:', error);
    const status = error instanceof Response ? error.status : 400;
    const message = error instanceof Response
      ? await error.clone().json().then((b: { error?: string }) => b.error).catch(() => 'Unauthorized')
      : (error as Error).message;

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
