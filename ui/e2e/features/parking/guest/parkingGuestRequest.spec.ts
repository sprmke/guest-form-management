import { expect, test } from '@playwright/test';

import {
  createParkingFlowState,
  installParkingFlowMocks,
  submitGuestParkingRequest,
} from '../shared/parkingFlowHarness';
import { captureParkingScreen, setParkingScreenSuite } from '../shared/parkingScreenCapture';

test.describe('parking guest flow', () => {
  test('guest can submit a parking request and land on the waiting screen', async ({ page }) => {
    setParkingScreenSuite('guest-request');
    const state = createParkingFlowState();
    await installParkingFlowMocks(page, state);

    await submitGuestParkingRequest(page);

    await expect(page.getByText('Waiting for a host')).toBeVisible();
    await expect(page.getByText('2026-08-25 to 2026-08-27')).toBeVisible();
    await expect(page.getByText('Kame Homes PH')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Parking' })).toBeVisible();
    await captureParkingScreen(page, 'guest-waiting-final', { role: 'guest' });
  });
});
