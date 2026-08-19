import { expect, type Page, type Route } from '@playwright/test';

import { captureParkingScreen } from './parkingScreenCapture';

const ORG_ID = 'org-e2e-001';
const PARKING_ID = 'parking-e2e-001';
const BOOKING_ID = 'booking-e2e-001';

export const parkingFlowPaths = {
  guestForm: '/parkings/slot-12a/form?checkInDate=2026-08-25&checkOutDate=2026-08-27',
  guestStatus: `/parkings/requests/${BOOKING_ID}`,
  hostBookings: '/org/kame-homes-ph/parking/slot-12a/bookings',
  hostBookingDetail: `/org/kame-homes-ph/parking/slot-12a/bookings/${BOOKING_ID}`,
} as const;

export const parkingFlowLabels = {
  guestName: 'Guest Name',
  email: 'Email',
  phone: 'Phone Number',
  unitNumber: 'Unit Number',
  vehicleType: 'Vehicle Type',
  submit: 'Submit Parking Request',
  accept: 'Accept',
  decline: 'Decline',
  accessInstructions: 'Access instructions (optional)',
} as const;

export type ParkingFlowState = {
  bookingId: string;
  status:
    | 'draft'
    | 'PENDING_HOST_ACCEPTANCE'
    | 'PENDING_REVIEW'
    | 'READY_FOR_CHECKIN'
    | 'COMPLETED'
    | 'NO_HOST_AVAILABLE';
  broadcastResponse: 'pending' | 'claimed' | 'declined' | 'expired';
  parkingId: string | null;
  parkingLabel: string | null;
  endorsementNote: string | null;
  expiresAt: string | null;
};

export function createParkingFlowState(): ParkingFlowState {
  return {
    bookingId: BOOKING_ID,
    status: 'draft',
    broadcastResponse: 'pending',
    parkingId: null,
    parkingLabel: null,
    endorsementNote: null,
    expiresAt: '2026-08-25T08:30:00.000Z',
  };
}

export function markParkingFlowUnavailable(
  state: ParkingFlowState,
  response: Extract<ParkingFlowState['broadcastResponse'], 'declined' | 'expired'> = 'expired'
) {
  state.status = 'NO_HOST_AVAILABLE';
  state.broadcastResponse = response;
  state.parkingId = null;
  state.parkingLabel = null;
  state.endorsementNote = null;
}

function bookingRow(state: ParkingFlowState) {
  return {
    id: state.bookingId,
    created_at: '2026-08-24T16:00:00.000Z',
    updated_at: '2026-08-24T16:00:00.000Z',
    booking_kind: 'parking',
    property_id: null,
    property_name: null,
    property_slug: null,
    parking_id: state.parkingId,
    parking_name: 'Slot 12A',
    parking_slug: 'slot-12a',
    guest_facebook_name: '',
    primary_guest_name: 'Jamie Park',
    guest_email: 'jamie@example.com',
    guest_phone_number: '09171234567',
    guest_address: null,
    nationality: null,
    primary_guest_age: null,
    guest2_name: null,
    guest2_age: null,
    guest3_name: null,
    guest3_age: null,
    guest4_name: null,
    guest4_age: null,
    guest5_name: null,
    guest5_age: null,
    guest2_valid_id_url: null,
    guest3_valid_id_url: null,
    guest4_valid_id_url: null,
    guest5_valid_id_url: null,
    check_in_date: '08-25-2026',
    check_out_date: '08-27-2026',
    check_in_time: null,
    check_out_time: null,
    number_of_adults: 1,
    number_of_children: 0,
    number_of_nights: 2,
    need_parking: false,
    car_plate_number: 'ABC-1234',
    car_brand_model: 'Toyota Vios',
    car_color: 'Gray',
    parking_endorsement_url: null,
    parking_broadcast_expires_at:
      state.status === 'PENDING_HOST_ACCEPTANCE' ? state.expiresAt : null,
    parking_claimed_at: state.status === 'PENDING_REVIEW' ? '2026-08-24T16:03:00.000Z' : null,
    parking_endorsement_note: state.endorsementNote,
    parking_request_organization_id: ORG_ID,
    has_pets: false,
    pet_name: null,
    pet_type: null,
    pet_breed: null,
    pet_age: null,
    pet_vaccination_date: null,
    find_us: null,
    find_us_details: null,
    booking_source: null,
    guest_requests_surprise_decor: false,
    surprise_decor_staff_acknowledged: false,
    guest_special_requests: null,
    valid_id_url: null,
    payment_receipt_url: null,
    pet_vaccination_url: null,
    pet_image_url: null,
    pdf_url: null,
    status: state.status === 'draft' ? 'PENDING_HOST_ACCEPTANCE' : state.status,
    booking_rate: 1200,
  };
}

function guestStatusPayload(state: ParkingFlowState) {
  const status = state.status === 'draft' ? 'PENDING_HOST_ACCEPTANCE' : state.status;
  return {
    status,
    checkInDate: '2026-08-25',
    checkOutDate: '2026-08-27',
    expiresAt: status === 'PENDING_HOST_ACCEPTANCE' ? state.expiresAt : null,
    parkingLabel: state.parkingLabel,
    endorsementNote: state.endorsementNote,
    organizationName: 'Kame Homes PH',
  };
}

function publicParkingDetail() {
  return {
    id: PARKING_ID,
    slug: 'slot-12a',
    name: 'Slot 12A',
    residenceName: 'One Palm Residences',
    tower: 'Tower 1',
    level: 'B2',
    slotLabel: '12A',
    parkingType: 'covered',
    ratePerNight: 1200,
    brandColor: '#0f766e',
    description: 'Covered parking slot near the main lobby.',
    spaceLengthM: 5.2,
    spaceWidthM: 2.4,
    heightClearanceM: 2.1,
    checkInTime: '14:00',
    checkOutTime: '12:00',
    pricing: {
      weekdayNightlyRate: 1200,
      weekendNightlyRate: 1350,
      dateOverrides: {},
      currency: 'PHP',
    },
    coverImage: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1200&q=80'],
    features: ['Covered', 'Near elevator'],
    notes: null,
    address: 'IT Park Drive',
    city: 'Cebu City',
    province: 'Cebu',
    country: 'Philippines',
    zipCode: '6000',
    latitude: 10.3285,
    longitude: 123.9053,
    placeId: null,
    orgSlug: 'kame-homes-ph',
    orgName: 'Kame Homes PH',
  };
}

function organizationList() {
  return {
    organizations: [
      {
        id: ORG_ID,
        name: 'Kame Homes PH',
        slug: 'kame-homes-ph',
        description: null,
        logoUrl: null,
        settings: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

function parkingList() {
  return {
    parkings: [
      {
        id: PARKING_ID,
        organizationId: ORG_ID,
        name: 'Slot 12A',
        slug: 'slot-12a',
        status: 'ACTIVE',
        residenceName: 'One Palm Residences',
        tower: 'Tower 1',
        level: 'B2',
        slotLabel: '12A',
        parkingType: 'covered',
        ratePerNight: 1200,
        acceptedVehicleTypes: ['car'],
        settings: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function parseRequestedParkingId(url: URL): string | null {
  return url.searchParams.get('parking_id');
}

export async function installParkingFlowMocks(page: Page, state: ParkingFlowState) {
  await page.addInitScript(
    ({ authKey, session, orgSlug, parkingSlug }) => {
      window.localStorage.setItem(authKey, JSON.stringify(session));
      window.localStorage.setItem('kame-last-org-slug', orgSlug);
      window.localStorage.setItem('kame-last-parking-slug', parkingSlug);
      window.localStorage.setItem('kame-last-tenant-kind', 'parking');
    },
    {
      authKey: 'kame:e2e-admin-session',
      session: {
        accessToken: 'playwright-admin-token',
        refreshToken: 'playwright-refresh-token',
        userId: 'user-e2e-host-001',
        email: 'host@example.com',
        name: 'Parking Host',
      },
      orgSlug: 'kame-homes-ph',
      parkingSlug: 'slot-12a',
    }
  );

  await page.route('**/functions/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split('/').pop();
    const body = route.request().postDataJSON?.() as Record<string, unknown> | undefined;

    switch (endpoint) {
      case 'get-public-parking':
        await fulfillJson(route, { success: true, data: publicParkingDetail() });
        return;
      case 'submit-parking-booking-request':
        state.status = 'PENDING_HOST_ACCEPTANCE';
        state.broadcastResponse = 'pending';
        state.parkingId = null;
        state.parkingLabel = null;
        state.endorsementNote = null;
        await fulfillJson(route, {
          success: true,
          data: {
            bookingId: state.bookingId,
            status: 'PENDING_HOST_ACCEPTANCE',
            expiresAt: state.expiresAt,
          },
        });
        return;
      case 'get-parking-booking-status':
        if (state.status === 'draft') {
          await fulfillJson(route, { success: false, error: 'Request not found' }, 404);
          return;
        }
        await fulfillJson(route, { success: true, data: guestStatusPayload(state) });
        return;
      case 'list-organizations':
        await fulfillJson(route, { success: true, data: organizationList() });
        return;
      case 'list-parkings':
        await fulfillJson(route, { success: true, data: parkingList() });
        return;
      case 'list-bookings':
        await fulfillJson(route, {
          success: true,
          data: state.status === 'draft' ? [] : [bookingRow(state)],
          total: state.status === 'draft' ? 0 : 1,
        });
        return;
      case 'get-parking-broadcast-status':
        await fulfillJson(route, {
          success: true,
          data: {
            exists: state.status !== 'draft',
            response: state.broadcastResponse,
          },
        });
        return;
      case 'claim-parking-booking':
        if (state.broadcastResponse !== 'pending') {
          await fulfillJson(route, { success: false, error: 'already_claimed' }, 409);
          return;
        }
        state.status = 'PENDING_REVIEW';
        state.broadcastResponse = 'claimed';
        state.parkingId = PARKING_ID;
        state.parkingLabel = 'Tower 1 · B2 · 12A';
        state.endorsementNote =
          typeof body?.endorsementNote === 'string' ? body.endorsementNote : null;
        await fulfillJson(route, { success: true, data: { booking: bookingRow(state) } });
        return;
      case 'decline-parking-booking':
        markParkingFlowUnavailable(state, 'declined');
        await fulfillJson(route, { success: true, data: { bookingTerminated: true } });
        return;
      case 'transition-parking-booking':
        if (body?.toStatus === 'READY_FOR_CHECKIN') {
          state.status = 'READY_FOR_CHECKIN';
        } else if (body?.toStatus === 'COMPLETED') {
          state.status = 'COMPLETED';
        }
        await fulfillJson(route, { success: true, data: bookingRow(state) });
        return;
      default:
        await route.continue();
    }
  });

  await page.route('**/rest/v1/guest_submissions*', async (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('id');
    const parkingId = parseRequestedParkingId(url);
    const wantsNullParking = parkingId === 'is.null';
    const row = bookingRow(state);

    if (id !== `eq.${state.bookingId}` || state.status === 'draft') {
      await fulfillJson(
        route,
        { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
        406
      );
      return;
    }

    if (parkingId === `eq.${PARKING_ID}` && row.parking_id === PARKING_ID) {
      await fulfillJson(route, row);
      return;
    }

    if (wantsNullParking && row.parking_id === null) {
      await fulfillJson(route, row);
      return;
    }

    if (!parkingId) {
      await fulfillJson(route, row);
      return;
    }

    await fulfillJson(
      route,
      {
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
      },
      406
    );
  });
}

export async function submitGuestParkingRequest(page: Page) {
  await page.goto(parkingFlowPaths.guestForm);
  await captureParkingScreen(page, 'guest-form', { role: 'guest' });
  await page.getByLabel(parkingFlowLabels.guestName).fill('Jamie Park');
  await page.getByLabel(parkingFlowLabels.email).fill('jamie@example.com');
  await page.getByLabel(parkingFlowLabels.phone).fill('09171234567');
  await page.getByLabel(parkingFlowLabels.unitNumber).fill('Tower 1 - 2604');
  await page.getByLabel(parkingFlowLabels.vehicleType).selectOption('car');
  await page.getByLabel('Car Plate Number').fill('ABC-1234');
  await page.getByLabel('Car Brand/Model').fill('Toyota Vios');
  await page.getByLabel('Car Color').fill('Gray');
  await page.getByRole('button', { name: parkingFlowLabels.submit }).click();
  await captureParkingScreen(page, 'guest-submit-success', { role: 'guest' });
  await page.getByRole('link', { name: 'Track Request' }).click();
  await expect(page).toHaveURL(new RegExp(`${parkingFlowPaths.guestStatus}$`));
  await captureParkingScreen(page, 'guest-waiting', { role: 'guest' });
}
