/**
 * claim-parking-booking — atomic first-Accept-wins claim on a broadcast parking request.
 */

import { createServiceClient, verifyParkingTeamAccess } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { sendParkingConfirmedEmail } from '../_shared/parkingBroadcastEmail.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('claim-parking-booking', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);
  const bookingId = String(body.bookingId ?? '').trim();
  const parkingId = String(body.parkingId ?? '').trim();
  const endorsementNote = typeof body.endorsementNote === 'string' ? body.endorsementNote : '';

  if (!bookingId || !parkingId) {
    return jsonError(req, 'bookingId and parkingId are required');
  }
  if (endorsementNote.length > 2000) {
    return jsonError(req, 'endorsementNote must be 2000 characters or fewer');
  }

  const { parking: parkingRow } = await verifyParkingTeamAccess(req, parkingId, 'bookings:edit');
  const supabase = createServiceClient();

  const { data: broadcastRow } = await supabase
    .from('parking_booking_broadcasts')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('parking_id', parkingId)
    .eq('response', 'pending')
    .maybeSingle();

  if (!broadcastRow) {
    return jsonError(req, 'already_claimed', 409);
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
    console.error('[claim-parking-booking]', claimError.message);
    return jsonError(req, 'Failed to claim booking', 500);
  }
  if (!claimed) {
    return jsonError(req, 'already_claimed', 409);
  }

  const { error: claimedBroadcastError } = await supabase
    .from('parking_booking_broadcasts')
    .update({ response: 'claimed', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('parking_id', parkingId);
  if (claimedBroadcastError) {
    console.error('[claim-parking-booking] mark claimed:', claimedBroadcastError.message);
  }

  const { error: expireOthersError } = await supabase
    .from('parking_booking_broadcasts')
    .update({ response: 'expired', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('response', 'pending');
  if (expireOthersError) {
    console.error('[claim-parking-booking] expire others:', expireOthersError.message);
  }

  const guestEmail = String(claimed.guest_email ?? '').trim();
  if (guestEmail) {
    const checkInDate = String(claimed.parking_check_in_date ?? claimed.check_in_date ?? '');
    const checkOutDate = String(claimed.parking_check_out_date ?? claimed.check_out_date ?? '');
    try {
      await sendParkingConfirmedEmail({
        to: guestEmail,
        parking: parkingRow,
        checkInDate,
        checkOutDate,
        endorsementNote: trimmedNote || null,
      });
    } catch (err) {
      console.error(
        '[claim-parking-booking] guest confirmation email failed:',
        err instanceof Error ? err.message : err
      );
    }
  }

  return jsonSuccess(req, { booking: claimed });
});
