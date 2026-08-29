import { expect, test } from '@playwright/test';

import { createParkingFlowState } from '../shared/parkingFlowHarness';
import { setParkingScreenSuite } from '../shared/parkingScreenCapture';
import {
  createPropertyBookingParkingState,
  installPropertyBookingParkingMocks,
  propertyBookingParkingPaths,
} from '../shared/propertyBookingParkingHarness';

test.describe('property booking parking panel', () => {
  test('shows linked marketplace match instead of legacy owner fields', async ({ page }) => {
    setParkingScreenSuite('property-linked-parking');
    const parkingState = createParkingFlowState();
    const propertyState = createPropertyBookingParkingState();
    await installPropertyBookingParkingMocks(page, parkingState, propertyState);

    await page.goto(propertyBookingParkingPaths.bookingDetail);
    await expect(page.getByRole('heading', { name: 'Maria Santos' })).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByRole('tablist', { name: 'Booking detail sections' })
      .getByRole('tab', { name: 'Parking', exact: true })
      .click();

    const parkingPanel = page.locator('#booking-detail-full-panel');
    await expect(parkingPanel.getByText('Status')).toBeVisible();
    await expect(parkingPanel.getByText('Confirmed', { exact: true })).toBeVisible();
    await expect(parkingPanel.getByText('Host', { exact: true })).toBeVisible();
    await expect(parkingPanel.getByText('Parking Host')).toBeVisible();
    await expect(parkingPanel.getByText('host@example.com')).toBeVisible();
    await expect(parkingPanel.getByRole('button', { name: 'Endorsement copy' })).toBeVisible();
    await expect(parkingPanel.getByText('Parking owner / agent')).toHaveCount(0);
  });
});
