/**
 * submit-parking-booking-request — public guest submit for the parking broadcast flow.
 * Inserts a pre-claim `PENDING_HOST_ACCEPTANCE` row (parking_id null) and fans out to
 * eligible candidates. Returns 422 with no insert when zero candidates are eligible.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import {
  fanOutParkingBroadcast,
  findParkingBroadcastCandidates,
  parkingBroadcastTtlMs,
} from '../_shared/parkingBroadcast.ts';
import { servePublic } from '../_shared/serveEdge.ts';
import { countStayNights } from '../_shared/utils.ts';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toMmDdYyyy(yyyyMmDd: string): string {
  const [yyyy, mm, dd] = yyyyMmDd.split('-');
  return `${mm}-${dd}-${yyyy}`;
}

servePublic('submit-parking-booking-request', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const parkingId = typeof body.parkingId === 'string' ? body.parkingId.trim() : '';
  const bodyOrgId = typeof body.organizationId === 'string' ? body.organizationId.trim() : '';
  const checkInDate = typeof body.checkInDate === 'string' ? body.checkInDate.trim() : '';
  const checkOutDate = typeof body.checkOutDate === 'string' ? body.checkOutDate.trim() : '';
  const vehicleType = body.vehicleType === 'motorcycle' ? 'motorcycle' : 'car';
  const primaryGuestName =
    typeof body.primaryGuestName === 'string' ? body.primaryGuestName.trim() : '';
  const guestEmail = typeof body.guestEmail === 'string' ? body.guestEmail.trim() : '';
  const guestPhone = typeof body.guestPhone === 'string' ? body.guestPhone.trim() : '';
  const unitNumber = typeof body.unitNumber === 'string' ? body.unitNumber.trim() : '';
  const carPlateNumber =
    typeof body.carPlateNumber === 'string' ? body.carPlateNumber.trim().toUpperCase() : '';
  const carBrandModel = typeof body.carBrandModel === 'string' ? body.carBrandModel.trim() : '';
  const carColor = typeof body.carColor === 'string' ? body.carColor.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  if (!parkingId && !bodyOrgId) {
    return jsonError(req, 'parkingId or organizationId is required');
  }
  if (!DATE_RE.test(checkInDate) || !DATE_RE.test(checkOutDate)) {
    return jsonError(req, 'checkInDate and checkOutDate must be YYYY-MM-DD');
  }
  if (checkOutDate <= checkInDate) {
    return jsonError(req, 'checkOutDate must be after checkInDate');
  }
  if (!primaryGuestName || primaryGuestName.length < 2) {
    return jsonError(req, 'primaryGuestName is required');
  }
  if (!EMAIL_RE.test(guestEmail)) {
    return jsonError(req, 'A valid guestEmail is required');
  }
  if (!unitNumber) {
    return jsonError(req, 'unitNumber is required');
  }
  if (!carPlateNumber) {
    return jsonError(req, 'carPlateNumber is required');
  }
  if (!carBrandModel) {
    return jsonError(req, 'carBrandModel is required');
  }
  if (!carColor) {
    return jsonError(req, 'carColor is required');
  }

  const supabase = createServiceClient();

  let organizationId = bodyOrgId;
  if (parkingId) {
    const { data: parking, error: parkingError } = await supabase
      .from('parkings')
      .select('id, organization_id, status')
      .eq('id', parkingId)
      .maybeSingle();
    if (parkingError || !parking || parking.status !== 'ACTIVE') {
      return jsonError(req, 'Parking not found', 404);
    }
    organizationId = String(parking.organization_id);
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .maybeSingle();
  if (orgError || !org) {
    return jsonError(req, 'Organization not found', 404);
  }

  const checkInDb = toMmDdYyyy(checkInDate);
  const checkOutDb = toMmDdYyyy(checkOutDate);

  const candidates = await findParkingBroadcastCandidates({
    organizationId,
    requestedVehicleType: vehicleType,
    checkInDate: checkInDb,
    checkOutDate: checkOutDb,
    pinnedParkingId: parkingId || null,
  });

  if (candidates.length === 0) {
    return jsonError(req, 'no_parking_available', 422);
  }

  const ttlMs = parkingBroadcastTtlMs(checkInDate);
  const expiresAtIso = new Date(Date.now() + ttlMs).toISOString();
  const guestName = primaryGuestName;

  const { data: inserted, error: insertError } = await supabase
    .from('guest_submissions')
    .insert({
      property_id: null,
      parking_id: null,
      parking_request_organization_id: organizationId,
      requested_vehicle_type: vehicleType,
      status: 'PENDING_HOST_ACCEPTANCE',
      status_updated_at: new Date().toISOString(),
      parking_broadcast_expires_at: expiresAtIso,
      guest_facebook_name: guestName,
      primary_guest_name: guestName,
      guest_email: guestEmail,
      guest_phone_number: guestPhone || 'N/A',
      guest_address: 'N/A',
      check_in_date: checkInDb,
      check_out_date: checkOutDb,
      parking_check_in_date: checkInDb,
      parking_check_out_date: checkOutDb,
      number_of_nights: Math.max(1, countStayNights(checkInDb, checkOutDb)),
      number_of_adults: 1,
      number_of_children: 0,
      need_parking: true,
      has_pets: false,
      find_us: 'Parking',
      booking_source: 'Parking',
      payment_receipt_url: 'parking-only',
      valid_id_url: null,
      unit_owner: 'N/A',
      tower_and_unit_number: unitNumber,
      owner_onsite_contact_person: 'N/A',
      owner_contact_number: 'N/A',
      car_plate_number: carPlateNumber,
      car_brand_model: carBrandModel,
      car_color: carColor,
      guest_special_requests: notes || null,
    })
    .select('id, status, parking_broadcast_expires_at')
    .single();

  if (insertError || !inserted) {
    console.error('[submit-parking-booking-request]', insertError?.message);
    return jsonError(req, 'Failed to submit parking request', 500);
  }

  try {
    await fanOutParkingBroadcast(
      {
        id: String(inserted.id),
        guestName,
        checkInDate: checkInDb,
        checkOutDate: checkOutDb,
        expiresAtIso,
      },
      candidates
    );
  } catch (err) {
    // Broadcast insert itself failed (not just a per-candidate notify failure, which
    // fanOutParkingBroadcast already swallows) — the booking row would otherwise sit at
    // PENDING_HOST_ACCEPTANCE with zero broadcast rows until the TTL cron eventually
    // times it out with a misleading "no host available" email. Roll it back instead so
    // the guest gets an honest error and can safely resubmit.
    console.error(
      '[submit-parking-booking-request] fan-out failed, rolling back booking:',
      err instanceof Error ? err.message : err
    );
    await supabase.from('guest_submissions').delete().eq('id', inserted.id);
    return jsonError(req, 'Failed to notify hosts, please try again', 500);
  }

  return jsonSuccess(req, {
    bookingId: inserted.id,
    status: inserted.status,
    expiresAt: inserted.parking_broadcast_expires_at,
  });
});
