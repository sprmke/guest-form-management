/**
 * get-sd-form — Public read-only payload for the guest SD refund stepper (/sd-form).
 *
 * GET ?bookingId=<uuid>
 * Returns minimal fields only when status === PENDING_SD_REFUND_DETAILS.
 * Otherwise 404 with a generic message (no status disclosure).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { DatabaseService } from '../_shared/databaseService.ts';

const NOT_FOUND = {
  success: false,
  error: 'not_found',
  message: 'This form is not available. Please use the link from your email or contact us on Facebook.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'GET') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const url = new URL(req.url);
    const bookingId = (url.searchParams.get('bookingId') ?? '').trim();
    if (!bookingId) {
      return new Response(JSON.stringify(NOT_FOUND), {
        status: 404,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const row = await DatabaseService.getBookingById(bookingId);
    if (!row || row.status !== 'PENDING_SD_REFUND_DETAILS') {
      return new Response(JSON.stringify(NOT_FOUND), {
        status: 404,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const facebookReviewsUrl =
      (Deno.env.get('FACEBOOK_REVIEWS_URL') ?? '').trim() ||
      'https://www.facebook.com';

    const sd = row.security_deposit != null ? Number(row.security_deposit) : 1500;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          bookingId: row.id,
          primary_guest_name: row.primary_guest_name ?? row.guest_facebook_name ?? '',
          guest_phone_number: row.guest_phone_number ?? '',
          security_deposit: sd,
          check_in_date: row.check_in_date,
          check_out_date: row.check_out_date,
          facebook_reviews_url: facebookReviewsUrl,
        },
      }),
      { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[get-sd-form]', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
