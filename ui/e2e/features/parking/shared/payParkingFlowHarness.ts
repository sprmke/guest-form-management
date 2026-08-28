import { expect, type Page, type Route } from '@playwright/test';

import { captureParkingScreen } from './parkingScreenCapture';

export const PAY_PARKING_PROPERTY_SLUG = 'solea-mactan';
export const PAY_PARKING_BOOKING_ID = 'property-booking-pay-parking-001';

export const payParkingFlowPaths = {
  guestPayParking: `/properties/${PAY_PARKING_PROPERTY_SLUG}/parking/${PAY_PARKING_BOOKING_ID}`,
  adminPayParking: `/properties/${PAY_PARKING_PROPERTY_SLUG}/parking/${PAY_PARKING_BOOKING_ID}?admin=true`,
} as const;

export const payParkingFlowLabels = {
  plate: 'Car plate number',
  brand: 'Car brand & model',
  color: 'Car color',
  submit: 'Submit parking request',
  update: 'Update parking details',
  saveBroadcast: 'Save and send broadcast email',
  saveOnly: 'Save details only',
} as const;

export type PayParkingFlowState = {
  bookingId: string;
  alreadySubmitted: boolean;
  lastSubmitBroadcast: boolean | null;
};

export function createPayParkingFlowState(): PayParkingFlowState {
  return {
    bookingId: PAY_PARKING_BOOKING_ID,
    alreadySubmitted: false,
    lastSubmitBroadcast: null,
  };
}

function payParkingBootstrap(state: PayParkingFlowState) {
  return {
    bookingId: state.bookingId,
    property_slug: PAY_PARKING_PROPERTY_SLUG,
    primary_guest_name: 'Maria Santos',
    guest_facebook_name: 'Maria Santos',
    check_in_date: '08-25-2026',
    check_out_date: '08-27-2026',
    check_in_time: '14:00',
    check_out_time: '12:00',
    number_of_nights: 2,
    number_of_adults: 2,
    number_of_children: 0,
    pax: 2,
    parking_rate_guest: 350,
    parking_check_in_date: '08-25-2026',
    parking_check_out_date: '08-27-2026',
    number_of_parking_nights: 2,
    car_plate_number: state.alreadySubmitted ? 'XYZ-9999' : '',
    car_brand_model: state.alreadySubmitted ? 'Honda Civic' : '',
    car_color: state.alreadySubmitted ? 'Blue' : '',
    already_submitted: state.alreadySubmitted,
    status: 'PENDING_DOCUMENTS',
    email_logo_url: null,
    brand_color: '#0f766e',
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installPayParkingFlowMocks(page: Page, state: PayParkingFlowState) {
  await page.route('**/functions/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split('/').pop();

    switch (endpoint) {
      case 'get-pay-parking':
        await fulfillJson(route, { success: true, data: payParkingBootstrap(state) });
        return;
      case 'submit-pay-parking': {
        const body = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
        const sendBroadcast = body?.sendParkingBroadcast !== false;
        state.alreadySubmitted = true;
        state.lastSubmitBroadcast = sendBroadcast;
        await fulfillJson(route, {
          success: true,
          data: {
            broadcastSent: sendBroadcast,
            sentToOwnerEmail: null,
          },
        });
        return;
      }
      case 'get-guest-payment-info':
        await fulfillJson(route, {
          success: true,
          data: {
            gcashName: 'Kame Homes',
            gcashNumber: '09170000000',
            gcashQrImageUrl: '',
            paymentProvider: 'gcash',
            paymentMethods: [],
            emailLogoUrl: '',
            brandColor: '#0f766e',
            gafUnitOwner: '',
            gafTowerAndUnitNumber: '',
            gafGuestsOnsiteContactPerson: '',
            gafOwnerContactNumber: '',
            allowPets: true,
            allowParking: true,
            allowSurpriseDecor: false,
            checkInTime: '14:00',
            checkOutTime: '12:00',
            cleaningBufferMinutes: 60,
            residenceName: 'Solea Mactan',
          },
        });
        return;
      default:
        await route.continue();
    }
  });
}

export async function fillPayParkingVehicleForm(
  page: Page,
  values: { plate: string; brand: string; color: string } = {
    plate: 'ABC-1234',
    brand: 'Toyota Vios',
    color: 'Gray',
  }
) {
  await page.getByLabel(payParkingFlowLabels.plate).fill(values.plate);
  await page.getByLabel(payParkingFlowLabels.brand).fill(values.brand);
  await page.getByLabel(payParkingFlowLabels.color).fill(values.color);
}

export async function submitPayParkingAsGuest(page: Page, state: PayParkingFlowState) {
  await page.goto(payParkingFlowPaths.guestPayParking);
  await captureParkingScreen(page, 'pay-parking-form', { role: 'guest' });
  await fillPayParkingVehicleForm(page);
  await page.getByRole('button', { name: payParkingFlowLabels.submit }).click();
  await expect(page.getByRole('heading', { name: 'Parking request sent' })).toBeVisible();
  await expect(page.getByText('Maria Santos')).toBeVisible();
  expect(state.lastSubmitBroadcast).toBe(true);
  await captureParkingScreen(page, 'pay-parking-success', { role: 'guest' });
}

export async function submitPayParkingAsAdminBroadcast(page: Page, state: PayParkingFlowState) {
  await page.goto(payParkingFlowPaths.adminPayParking);
  await fillPayParkingVehicleForm(page, {
    plate: 'ADM-001',
    brand: 'Mitsubishi Mirage',
    color: 'White',
  });
  await page.getByRole('button', { name: payParkingFlowLabels.submit }).click();
  await page.getByRole('button', { name: payParkingFlowLabels.saveBroadcast }).click();
  await expect(page.getByRole('heading', { name: 'Parking request sent' })).toBeVisible();
  expect(state.lastSubmitBroadcast).toBe(true);
}
