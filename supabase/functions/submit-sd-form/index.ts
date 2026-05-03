/**
 * submit-sd-form — Public POST to submit guest SD refund preferences.
 *
 * Body: { bookingId, refund: { method, ... } }; optional guestFeedback (stored when provided).
 * Validates status === READY_FOR_CHECKOUT, then transitions → PENDING_SD_REFUND via orchestrator.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { WorkflowOrchestrator } from '../_shared/workflowOrchestrator.ts';
import type { TransitionPayload } from '../_shared/workflowOrchestrator.ts';

type RefundBody = {
  method: 'same_phone' | 'other_bank' | 'cash';
  phoneConfirmed?: boolean;
  bank?: 'GCash' | 'Maribank' | 'BDO' | 'BPI' | null;
  accountName?: string | null;
  accountNumber?: string | null;
};

function validateRefund(r: RefundBody): string | null {
  if (!r?.method) return 'refund.method is required';
  // same_phone — guest selects the option that shows their on-file number; no separate checkbox.
  if (r.method === 'other_bank') {
    if (!r.bank) return 'Bank is required';
    if (!r.accountName?.trim()) return 'Account name is required';
    if (!r.accountNumber?.trim()) return 'Account number is required';
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = await req.json().catch(() => null) as {
      bookingId?: string;
      guestFeedback?: string;
      refund?: RefundBody;
    } | null;

    const bookingId = (body?.bookingId ?? '').trim();
    const guestFeedback =
      typeof body?.guestFeedback === 'string'
        ? body.guestFeedback.trim()
        : '';
    const refund = body?.refund;

    if (!bookingId) throw new Error('bookingId is required');
    const errRefund = refund ? validateRefund(refund) : 'refund is required';
    if (errRefund) throw new Error(errRefund);

    const row = await DatabaseService.getBookingById(bookingId);
    if (!row || row.status !== 'READY_FOR_CHECKOUT') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'not_available',
          message: 'This form is no longer available for this booking.',
        }),
        { status: 409, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    const payload: TransitionPayload = {
      sd_refund_guest_feedback: guestFeedback || null,
      sd_refund_method: refund!.method,
      sd_refund_phone_confirmed:
        refund!.method === 'same_phone' ? true : null,
      sd_refund_bank:
        refund!.method === 'other_bank' ? refund!.bank ?? null : null,
      sd_refund_account_name:
        refund!.method === 'other_bank' ? (refund!.accountName ?? '').trim() : null,
      sd_refund_account_number:
        refund!.method === 'other_bank' ? (refund!.accountNumber ?? '').trim() : null,
    };

    await WorkflowOrchestrator.transition(
      bookingId,
      'PENDING_SD_REFUND',
      payload,
      {
        saveToDatabase: true,
        updateGoogleCalendar: true,
        updateGoogleSheets: true,
        sendGafRequestEmail: false,
        sendParkingBroadcastEmail: false,
        sendPetRequestEmail: false,
        sendBookingAcknowledgementEmail: false,
        sendReadyForCheckinEmail: false,
        sendSdRefundFormEmail: false,
      },
      false,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you — we have received your security deposit refund information.',
      }),
      { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[submit-sd-form]', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
