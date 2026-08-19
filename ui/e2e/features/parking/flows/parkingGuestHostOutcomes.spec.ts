import { expect, test } from '@playwright/test';

import {
  createParkingFlowState,
  installParkingFlowMocks,
  markParkingFlowUnavailable,
  parkingFlowLabels,
  parkingFlowPaths,
  submitGuestParkingRequest,
} from '../shared/parkingFlowHarness';
import { captureParkingScreen, setParkingScreenSuite } from '../shared/parkingScreenCapture';

test.describe('parking guest and host outcomes', () => {
  test('guest sees a no-host-available state when the request expires', async ({ page }) => {
    setParkingScreenSuite('outcome-expired');
    const state = createParkingFlowState();
    await installParkingFlowMocks(page, state);

    await submitGuestParkingRequest(page);
    markParkingFlowUnavailable(state, 'expired');
    await page.reload();

    await expect(page.getByText('No host available')).toBeVisible();
    await expect(
      page.getByText(
        'No host was available for these dates. Try another listing or contact us for help.'
      )
    ).toBeVisible();
    await captureParkingScreen(page, 'guest-no-host-expired', { role: 'guest' });
  });

  test('guest sees a no-host-available state when the backend already closed the request', async ({
    page,
  }) => {
    setParkingScreenSuite('outcome-closed-backend');
    const state = createParkingFlowState();
    await installParkingFlowMocks(page, state);

    await submitGuestParkingRequest(page);
    state.status = 'NO_HOST_AVAILABLE';
    state.broadcastResponse = 'declined';
    await page.reload();

    await expect(page.getByText('No host available')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Parking' })).toBeVisible();
    await captureParkingScreen(page, 'guest-no-host-closed', { role: 'guest' });
  });

  test('host can decline a pending request and the guest sees the request close out', async ({
    page,
  }) => {
    setParkingScreenSuite('outcome-decline');
    const state = createParkingFlowState();
    await installParkingFlowMocks(page, state);

    await submitGuestParkingRequest(page);
    await page.goto(parkingFlowPaths.hostBookings);
    await captureParkingScreen(page, 'host-bookings-list', { role: 'host' });
    await page.getByRole('button', { name: 'Open booking for Jamie Park' }).click();
    await captureParkingScreen(page, 'host-booking-detail-pending', { role: 'host' });
    await page.getByRole('button', { name: parkingFlowLabels.decline }).click();

    await expect(page.getByText('No Host Available')).toBeVisible();
    await expect(page.getByText('Request declined')).toBeVisible();
    await captureParkingScreen(page, 'host-booking-declined', { role: 'host' });

    await page.goto(parkingFlowPaths.guestStatus);
    await expect(page.getByText('No host available')).toBeVisible();
    await captureParkingScreen(page, 'guest-no-host-after-decline', { role: 'guest' });
  });
});
