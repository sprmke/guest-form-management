import { expect, test } from '@playwright/test';

import {
  createParkingFlowState,
  guestPayForParking,
  installParkingFlowMocks,
  parkingGuestStatusLabels,
  submitGuestParkingRequest,
} from '../shared/parkingFlowHarness';
import { captureParkingScreen, setParkingScreenSuite } from '../shared/parkingScreenCapture';

test.describe('parking guest flow', () => {
  test('guest can submit a parking request and land on the waiting screen', async ({ page }) => {
    setParkingScreenSuite('guest-request');
    const state = createParkingFlowState();
    await installParkingFlowMocks(page, state);

    await submitGuestParkingRequest(page);

    await expect(
      page.getByRole('heading', { name: parkingGuestStatusLabels.findingHost })
    ).toBeVisible();
    await expect(page.getByText(parkingGuestStatusLabels.stayRange)).toBeVisible();
    await expect(
      page.locator('.section-eyebrow').filter({ hasText: 'Kame Homes PH' })
    ).toBeVisible();
    await expect(page.getByText(parkingGuestStatusLabels.searchingNearby)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel request' })).toBeVisible();
    await captureParkingScreen(page, 'guest-waiting-final', { role: 'guest' });
  });

  test('guest can pay after host accept and see confirmation details', async ({ page }) => {
    setParkingScreenSuite('guest-payment');
    const state = createParkingFlowState();
    await installParkingFlowMocks(page, state);

    await submitGuestParkingRequest(page, { skipScreens: true });
    state.status = 'PENDING_PAYMENT';
    state.parkingId = 'parking-e2e-001';
    state.parkingLabel = 'Tower 1 · B2 · 12A';
    state.parkingSlug = 'slot-12a';
    state.endorsementNote = 'Use the Tower 1 ramp.';
    state.paymentExpiresAt = new Date(Date.now() + 45 * 60_000).toISOString();
    state.broadcastResponse = 'claimed';

    await page.reload();
    await expect(
      page.getByRole('heading', { name: parkingGuestStatusLabels.payToConfirm })
    ).toBeVisible();
    await guestPayForParking(page, state);
    await expect(
      page.getByRole('heading', { name: parkingGuestStatusLabels.parkingConfirmed })
    ).toBeVisible();
    await expect(page.getByText('Access')).toBeVisible();
    await captureParkingScreen(page, 'guest-paid-final', { role: 'guest' });
  });
});
