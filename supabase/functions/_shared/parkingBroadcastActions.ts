/**
 * Shared parking-broadcast claim/decline logic — single source of truth for
 * `claim-parking-booking` / `decline-parking-booking` and the AI dashboard assistant's
 * `propose_claim_parking_booking` / `propose_decline_parking_booking` tools.
 *
 * The guarded `.eq('status', 'PENDING_HOST_ACCEPTANCE')` UPDATE is the actual first-Accept-wins
 * safety mechanism (see `.cursor/rules/parking-workflow.mdc`) — it must not be reimplemented
 * per-caller, or a second implementation could silently diverge from the guard that makes this
 * race-safe.
 */

import { createServiceClient, type ParkingRow } from './orgAuth.ts';
import { sendParkingAwaitingPaymentEmail } from './parkingBroadcastEmail.ts';
import { parkingAutomationEnabled } from './parkingAutomationToggles.ts';
import { advanceOrTerminateParkingBatch } from './parkingBroadcastExpireCron.ts';
import { parkingBroadcastTtlMs } from './parkingBroadcast.ts';

export class ParkingBroadcastActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function mmDdYyyyToYyyyMmDd(value: string): string {
  const [mm, dd, yyyy] = value.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Atomically claims a pending broadcast candidacy — sets `PENDING_PAYMENT` (not confirmed yet;
 * Phase 3 gates confirmation on the guest actually paying) with a fresh payment-window TTL, and
 * emails the guest a "pay to confirm" nudge instead of the old immediate confirmation.
 */
export async function claimParkingBooking(
  parkingId: string,
  bookingId: string,
  endorsementNote: string,
  parkingRow: ParkingRow
): Promise<Record<string, unknown>> {
  if (endorsementNote.length > 2000) {
    throw new ParkingBroadcastActionError('endorsementNote must be 2000 characters or fewer');
  }

  const supabase = createServiceClient();

  const { data: broadcastRow } = await supabase
    .from('parking_booking_broadcasts')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('parking_id', parkingId)
    .eq('response', 'pending')
    .maybeSingle();

  if (!broadcastRow) {
    throw new ParkingBroadcastActionError('already_claimed', 409);
  }

  const trimmedNote = endorsementNote.trim();
  const nowIso = new Date().toISOString();

  const { data: preClaim } = await supabase
    .from('guest_submissions')
    .select('parking_check_in_date, check_in_date')
    .eq('id', bookingId)
    .maybeSingle();
  const checkInDbFormat = String(preClaim?.parking_check_in_date ?? preClaim?.check_in_date ?? '');
  const ttlMs = checkInDbFormat
    ? parkingBroadcastTtlMs(mmDdYyyyToYyyyMmDd(checkInDbFormat))
    : 60 * 60_000;
  const paymentExpiresAtIso = new Date(Date.now() + ttlMs).toISOString();

  const { data: claimed, error: claimError } = await supabase
    .from('guest_submissions')
    .update({
      status: 'PENDING_PAYMENT',
      status_updated_at: nowIso,
      parking_id: parkingId,
      parking_claimed_at: nowIso,
      parking_endorsement_note: trimmedNote || null,
      parking_payment_expires_at: paymentExpiresAtIso,
      updated_at: nowIso,
    })
    .eq('id', bookingId)
    .eq('status', 'PENDING_HOST_ACCEPTANCE')
    .not('parking_request_organization_id', 'is', null)
    .select('*')
    .maybeSingle();

  if (claimError) {
    throw new ParkingBroadcastActionError('Failed to claim booking', 500);
  }
  if (!claimed) {
    throw new ParkingBroadcastActionError('already_claimed', 409);
  }

  await supabase
    .from('parking_booking_broadcasts')
    .update({ response: 'claimed', responded_at: nowIso })
    .eq('booking_id', bookingId)
    .eq('parking_id', parkingId);

  await supabase
    .from('parking_booking_broadcasts')
    .update({ response: 'expired', responded_at: nowIso })
    .eq('booking_id', bookingId)
    .eq('response', 'pending');

  const guestEmail = String(claimed.guest_email ?? '').trim();
  if (guestEmail) {
    const checkInDate = String(claimed.parking_check_in_date ?? claimed.check_in_date ?? '');
    const checkOutDate = String(claimed.parking_check_out_date ?? claimed.check_out_date ?? '');
    try {
      const emailEnabled = await parkingAutomationEnabled(parkingId, 'emailParkingGuestConfirmed');
      if (emailEnabled) {
        await sendParkingAwaitingPaymentEmail({
          to: guestEmail,
          parking: parkingRow,
          checkInDate,
          checkOutDate,
          expiresAtIso: paymentExpiresAtIso,
          bookingId,
        });
      }
    } catch (err) {
      console.error(
        '[parkingBroadcastActions] claim awaiting-payment email failed:',
        err instanceof Error ? err.message : err
      );
    }
  }

  return claimed;
}

/**
 * Records a decline; if every candidate *in this batch* has now declined, dispatches the
 * next ranked batch or terminates to NO_HOST_AVAILABLE (via `advanceOrTerminateParkingBatch`
 * — never reimplement that guard here, see its docstring).
 */
export async function declineParkingBooking(
  parkingId: string,
  bookingId: string
): Promise<{ bookingTerminated: boolean }> {
  const supabase = createServiceClient();

  const { data: booking } = await supabase
    .from('guest_submissions')
    .select('parking_broadcast_batch_number')
    .eq('id', bookingId)
    .maybeSingle();
  const batchNumber = Number(booking?.parking_broadcast_batch_number ?? 1);

  const { data: declined, error: declineError } = await supabase
    .from('parking_booking_broadcasts')
    .update({ response: 'declined', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('parking_id', parkingId)
    .eq('response', 'pending')
    .select('id')
    .maybeSingle();

  if (declineError) {
    throw new ParkingBroadcastActionError('Failed to decline booking', 500);
  }
  if (!declined) {
    throw new ParkingBroadcastActionError('Already responded to this request', 409);
  }

  const { data: remainingPending } = await supabase
    .from('parking_booking_broadcasts')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('batch_number', batchNumber)
    .eq('response', 'pending')
    .limit(1);

  if ((remainingPending?.length ?? 0) > 0) {
    return { bookingTerminated: false };
  }

  const result = await advanceOrTerminateParkingBatch(bookingId, batchNumber);
  return { bookingTerminated: result.terminated };
}
