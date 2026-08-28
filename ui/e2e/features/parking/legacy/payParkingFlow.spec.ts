import { expect, test } from '@playwright/test';

import {
  createPayParkingFlowState,
  installPayParkingFlowMocks,
  submitPayParkingAsAdminBroadcast,
  submitPayParkingAsGuest,
} from '../shared/payParkingFlowHarness';
import { setParkingScreenSuite } from '../shared/parkingScreenCapture';

test.describe('legacy property pay-parking flow', () => {
  test('guest can submit vehicle details on the pay-parking form', async ({ page }) => {
    setParkingScreenSuite('pay-parking-guest');
    const state = createPayParkingFlowState();
    await installPayParkingFlowMocks(page, state);

    await submitPayParkingAsGuest(page, state);
    await expect(page.getByRole('heading', { name: 'Parking request sent' })).toBeVisible();
    await expect(page.getByText('Maria Santos')).toBeVisible();
    expect(state.lastSubmitBroadcast).toBe(true);
  });

  test('host can add pay parking from admin mode with broadcast email', async ({ page }) => {
    setParkingScreenSuite('pay-parking-admin');
    const state = createPayParkingFlowState();
    await installPayParkingFlowMocks(page, state);

    await submitPayParkingAsAdminBroadcast(page, state);
    await expect(page.getByRole('heading', { name: 'Parking request sent' })).toBeVisible();
    expect(state.lastSubmitBroadcast).toBe(true);
  });
});
