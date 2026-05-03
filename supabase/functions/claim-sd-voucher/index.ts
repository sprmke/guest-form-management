/**
 * claim-sd-voucher — Public POST that idempotently awards a next-stay voucher.
 *
 * Called when the guest taps "Reveal my voucher" on /sd-form (after the
 * Facebook-review link is opened). The handler ignores the optional client
 * `code` and rolls server-side from VOUCHER_WIN_POOL so the outcome is not
 * tamperable. If a voucher is already on the booking, that one is returned
 * instead of rolling again.
 *
 * Status guard: only available while the booking is `READY_FOR_CHECKOUT`.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { rollVoucher } from '../_shared/voucher.ts';
import type { VoucherCode } from '../_shared/voucher.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = (await req.json().catch(() => null)) as {
      bookingId?: string;
    } | null;

    const bookingId = (body?.bookingId ?? '').trim();
    if (!bookingId) throw new Error('bookingId is required');

    const row = await DatabaseService.getBookingById(bookingId);
    if (!row || row.status !== 'READY_FOR_CHECKOUT') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'not_available',
          message: 'This form is no longer available for this booking.',
        }),
        {
          status: 409,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
    }

    let code = (row.next_stay_voucher_code ?? null) as VoucherCode | null;
    let amount =
      row.next_stay_voucher_amount != null
        ? Number(row.next_stay_voucher_amount)
        : null;
    let alreadyAwarded = !!code;

    if (!code) {
      const rolled = rollVoucher();
      code = rolled.code;
      amount = rolled.amount;
      await DatabaseService.setWorkflowFields(bookingId, {
        next_stay_voucher_code: code,
        next_stay_voucher_amount: amount,
        next_stay_voucher_awarded_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { code, amount, alreadyAwarded },
      }),
      {
        status: 200,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[claim-sd-voucher]', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});
