import { type Page, type Route } from '@playwright/test';

import {
  E2E_PROPERTY_BOOKING_ID,
  E2E_PROPERTY_ID,
  E2E_PROPERTY_SLUG,
  installParkingFlowMocks,
  type ParkingFlowState,
} from './parkingFlowHarness';

export const PROPERTY_ID = E2E_PROPERTY_ID;
export const PROPERTY_SLUG = E2E_PROPERTY_SLUG;
export const PROPERTY_BOOKING_ID = E2E_PROPERTY_BOOKING_ID;

export const propertyBookingParkingPaths = {
  bookingDetail: `/org/kame-homes-ph/property/${PROPERTY_SLUG}/bookings/${PROPERTY_BOOKING_ID}`,
} as const;

export type PropertyBookingParkingState = {
  linked: boolean;
  linkedStatus: string;
  hostContact: { name: string; email: string; phone: string | null } | null;
  endorsementSentAt: string | null;
};

export function createPropertyBookingParkingState(): PropertyBookingParkingState {
  return {
    linked: true,
    linkedStatus: 'READY_FOR_CHECKIN',
    hostContact: {
      name: 'Parking Host',
      email: 'host@example.com',
      phone: '09171230000',
    },
    endorsementSentAt: '2026-08-24T16:20:00.000Z',
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installPropertyBookingParkingMocks(
  page: Page,
  parkingState: ParkingFlowState,
  propertyState: PropertyBookingParkingState
) {
  await installParkingFlowMocks(page, parkingState);
  await page.addInitScript(
    ({ orgSlug, propertySlug }) => {
      window.localStorage.setItem('kame-last-org-slug', orgSlug);
      window.localStorage.setItem('kame-last-property-slug', propertySlug);
      window.localStorage.setItem('kame-last-tenant-kind', 'property');
    },
    { orgSlug: 'kame-homes-ph', propertySlug: PROPERTY_SLUG }
  );

  await page.route('**/functions/v1/get-linked-parking-booking**', async (route) => {
    if (!propertyState.linked) {
      await fulfillJson(route, { success: true, data: { linked: false } });
      return;
    }
    await fulfillJson(route, {
      success: true,
      data: {
        linked: true,
        parkingBookingId: 'e2e-linked-parking-booking',
        status: propertyState.linkedStatus,
        endorsementSentAt: propertyState.endorsementSentAt,
        endorsementSendError: null,
        endorsementEmailSnapshot: propertyState.endorsementSentAt
          ? '<p>Parking endorsement sent for Maria Santos.</p>'
          : null,
        hostContact: propertyState.hostContact,
      },
    });
  });
}
