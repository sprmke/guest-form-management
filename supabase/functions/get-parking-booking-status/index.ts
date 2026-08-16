/**
 * get-parking-booking-status — public narrow read for the guest status page.
 * The booking UUID in the URL is the bearer capability — do not add a list endpoint.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { servePublic } from '../_shared/serveEdge.ts';

servePublic('get-parking-booking-status', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, `Method ${req.method} not allowed`, 405);
  }

  const url = new URL(req.url);
  const bookingId = url.searchParams.get('bookingId')?.trim();
  if (!bookingId) {
    return jsonError(req, 'bookingId query param is required');
  }

  const supabase = createServiceClient();
  const { data: booking, error } = await supabase
    .from('guest_submissions')
    .select(
      'id, status, parking_id, parking_check_in_date, parking_check_out_date, check_in_date, check_out_date, parking_broadcast_expires_at, parking_endorsement_note, parking_request_organization_id'
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !booking) {
    return jsonError(req, 'Not found', 404);
  }

  // Must be a parking request/booking row — never leak property stay bookings.
  const isParkingRow =
    Boolean(booking.parking_id) || Boolean(booking.parking_request_organization_id);
  if (!isParkingRow) {
    return jsonError(req, 'Not found', 404);
  }

  let parkingLabel: string | null = null;
  let organizationName: string | null = null;

  if (booking.parking_id) {
    const { data: parking } = await supabase
      .from('parkings')
      .select('name, slot_label, tower, organization_id')
      .eq('id', booking.parking_id)
      .maybeSingle();
    if (parking) {
      parkingLabel =
        [parking.slot_label, parking.tower].filter(Boolean).join(' · ') || parking.name;
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', parking.organization_id)
        .maybeSingle();
      organizationName = (org?.name as string | undefined) ?? null;
    }
  } else if (booking.parking_request_organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', booking.parking_request_organization_id)
      .maybeSingle();
    organizationName = (org?.name as string | undefined) ?? null;
  }

  return jsonSuccess(req, {
    status: booking.status,
    checkInDate: String(booking.parking_check_in_date ?? booking.check_in_date ?? ''),
    checkOutDate: String(booking.parking_check_out_date ?? booking.check_out_date ?? ''),
    expiresAt: booking.parking_broadcast_expires_at ?? null,
    parkingLabel,
    endorsementNote: booking.parking_endorsement_note ?? null,
    organizationName,
  });
});
