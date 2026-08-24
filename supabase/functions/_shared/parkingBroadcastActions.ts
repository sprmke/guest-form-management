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
import {
  sendParkingConfirmedEmail,
  sendParkingNoHostAvailableEmail,
} from './parkingBroadcastEmail.ts';
import { parkingAutomationEnabled } from './parkingAutomationToggles.ts';

export class ParkingBroadcastActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Atomically claims a pending broadcast candidacy; sends the guest confirmation email on success. */
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
  const { data: claimed, error: claimError } = await supabase
    .from('guest_submissions')
    .update({
      status: 'PENDING_REVIEW',
      status_updated_at: new Date().toISOString(),
      parking_id: parkingId,
      parking_claimed_at: new Date().toISOString(),
      parking_endorsement_note: trimmedNote || null,
      updated_at: new Date().toISOString(),
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
    .update({ response: 'claimed', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('parking_id', parkingId);

  await supabase
    .from('parking_booking_broadcasts')
    .update({ response: 'expired', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('response', 'pending');

  const guestEmail = String(claimed.guest_email ?? '').trim();
  if (guestEmail) {
    const checkInDate = String(claimed.parking_check_in_date ?? claimed.check_in_date ?? '');
    const checkOutDate = String(claimed.parking_check_out_date ?? claimed.check_out_date ?? '');
    try {
      const emailEnabled = await parkingAutomationEnabled(parkingId, 'emailParkingGuestConfirmed');
      if (emailEnabled) {
        await sendParkingConfirmedEmail({
          to: guestEmail,
          parking: parkingRow,
          checkInDate,
          checkOutDate,
          endorsementNote: trimmedNote || null,
        });
      }
    } catch (err) {
      console.error(
        '[parkingBroadcastActions] claim confirmation email failed:',
        err instanceof Error ? err.message : err
      );
    }
  }

  return claimed;
}

/** Records a decline; if every candidate has now declined, terminates to NO_HOST_AVAILABLE and notifies the guest once. */
export async function declineParkingBooking(
  parkingId: string,
  bookingId: string
): Promise<{ bookingTerminated: boolean }> {
  const supabase = createServiceClient();

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
    .eq('response', 'pending')
    .limit(1);

  if ((remainingPending?.length ?? 0) > 0) {
    return { bookingTerminated: false };
  }

  const { data: terminated, error: terminateError } = await supabase
    .from('guest_submissions')
    .update({
      status: 'NO_HOST_AVAILABLE',
      status_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('status', 'PENDING_HOST_ACCEPTANCE')
    .select('*')
    .maybeSingle();

  if (terminateError) {
    throw new ParkingBroadcastActionError('Failed to terminate booking', 500);
  }

  if (terminated) {
    const guestEmail = String(terminated.guest_email ?? '').trim();
    const organizationId = String(terminated.parking_request_organization_id ?? '');
    if (guestEmail && organizationId) {
      const checkInDate = String(
        terminated.parking_check_in_date ?? terminated.check_in_date ?? ''
      );
      const checkOutDate = String(
        terminated.parking_check_out_date ?? terminated.check_out_date ?? ''
      );
      try {
        const emailEnabled = await parkingAutomationEnabled(
          parkingId,
          'emailParkingNoHostAvailable'
        );
        if (emailEnabled) {
          await sendParkingNoHostAvailableEmail({
            to: guestEmail,
            organizationId,
            checkInDate,
            checkOutDate,
          });
        }
      } catch (err) {
        console.error(
          '[parkingBroadcastActions] no-host-available email failed:',
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  return { bookingTerminated: Boolean(terminated) };
}
