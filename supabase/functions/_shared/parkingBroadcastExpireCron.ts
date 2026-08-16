/**
 * TTL expiry sweep for parking broadcast requests — flips stale `PENDING_HOST_ACCEPTANCE`
 * bookings to `NO_HOST_AVAILABLE` once `parking_broadcast_expires_at` has passed.
 * v1: single broadcast round, no re-broadcast.
 */

import { createServiceClient } from './orgAuth.ts';
import { sendParkingNoHostAvailableEmail } from './parkingBroadcastEmail.ts';

export function verifyParkingBroadcastExpireCronSecret(req: Request): boolean {
  const expected = Deno.env.get('PARKING_BROADCAST_EXPIRE_CRON_SECRET')?.trim();
  if (!expected) return true;
  const got = req.headers.get('x-parking-broadcast-expire-cron-secret')?.trim();
  return got === expected;
}

export async function runExpireParkingBroadcasts(): Promise<Record<string, unknown>> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: expiredBookings, error } = await supabase
    .from('guest_submissions')
    .select(
      'id, guest_email, parking_request_organization_id, parking_check_in_date, parking_check_out_date, check_in_date, check_out_date'
    )
    .eq('status', 'PENDING_HOST_ACCEPTANCE')
    .lt('parking_broadcast_expires_at', nowIso);

  if (error) {
    throw new Error(`runExpireParkingBroadcasts select: ${error.message}`);
  }

  let expiredCount = 0;
  let emailedCount = 0;

  for (const booking of expiredBookings ?? []) {
    const bookingId = String(booking.id);

    // Guarded UPDATE — only the first run for this booking actually transitions it,
    // so a cron re-run within the same window never double-terminates or double-emails.
    const { data: terminated, error: terminateError } = await supabase
      .from('guest_submissions')
      .update({
        status: 'NO_HOST_AVAILABLE',
        status_updated_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', bookingId)
      .eq('status', 'PENDING_HOST_ACCEPTANCE')
      .select('*')
      .maybeSingle();

    if (terminateError) {
      console.error('[expire-parking-broadcasts] terminate:', terminateError.message);
      continue;
    }
    if (!terminated) continue;
    expiredCount += 1;

    const { error: expireBroadcastsError } = await supabase
      .from('parking_booking_broadcasts')
      .update({ response: 'expired', responded_at: nowIso })
      .eq('booking_id', bookingId)
      .eq('response', 'pending');
    if (expireBroadcastsError) {
      console.error(
        '[expire-parking-broadcasts] mark broadcasts expired:',
        expireBroadcastsError.message
      );
    }

    const guestEmail = String(terminated.guest_email ?? '').trim();
    const organizationId = String(terminated.parking_request_organization_id ?? '');
    if (!guestEmail || !organizationId) continue;

    const checkInDate = String(terminated.parking_check_in_date ?? terminated.check_in_date ?? '');
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
      emailedCount += 1;
    } catch (err) {
      console.error(
        '[expire-parking-broadcasts] guest notice email failed:',
        err instanceof Error ? err.message : err
      );
    }
  }

  return { scanned: expiredBookings?.length ?? 0, expired: expiredCount, emailed: emailedCount };
}
