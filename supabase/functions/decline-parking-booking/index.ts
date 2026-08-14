/**
 * decline-parking-booking — a host declines their broadcast candidacy.
 * When every candidate has declined, the booking terminates to NO_HOST_AVAILABLE
 * (before TTL) and the guest is notified once.
 */

import { createServiceClient, verifyParkingTeamAccess } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { sendParkingNoHostAvailableEmail } from '../_shared/parkingBroadcastEmail.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('decline-parking-booking', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);
  const bookingId = String(body.bookingId ?? '').trim();
  const parkingId = String(body.parkingId ?? '').trim();

  if (!bookingId || !parkingId) {
    return jsonError(req, 'bookingId and parkingId are required');
  }

  await verifyParkingTeamAccess(req, parkingId, 'bookings:edit');
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
    console.error('[decline-parking-booking]', declineError.message);
    return jsonError(req, 'Failed to decline booking', 500);
  }
  if (!declined) {
    return jsonError(req, 'Already responded to this request', 409);
  }

  const { data: remainingPending } = await supabase
    .from('parking_booking_broadcasts')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('response', 'pending')
    .limit(1);

  if ((remainingPending?.length ?? 0) > 0) {
    return jsonSuccess(req, { bookingTerminated: false });
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
    console.error('[decline-parking-booking] terminate:', terminateError.message);
    return jsonError(req, 'Failed to terminate booking', 500);
  }

  // Guarded UPDATE above only affects a row once — safe to send exactly one guest email here.
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
        await sendParkingNoHostAvailableEmail({
          to: guestEmail,
          organizationId,
          checkInDate,
          checkOutDate,
        });
      } catch (err) {
        console.error(
          '[decline-parking-booking] guest notice email failed:',
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  return jsonSuccess(req, { bookingTerminated: Boolean(terminated) });
});
