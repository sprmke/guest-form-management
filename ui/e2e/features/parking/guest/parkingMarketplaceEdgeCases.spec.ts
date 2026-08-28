import { expect, test } from '@playwright/test';

import {
  createParkingFlowState,
  fillGuestParkingRegistrationForm,
  installParkingFlowMocks,
  parkingFlowPaths,
  parkingGuestStatusLabels,
  submitGuestParkingRequest,
} from '../shared/parkingFlowHarness';
import { setParkingScreenSuite } from '../shared/parkingScreenCapture';

test.describe('parking marketplace edge cases', () => {
  test('shows no availability when every slot is excluded', async ({ page }) => {
    setParkingScreenSuite('no-parking-available');
    const state = createParkingFlowState();
    state.rejectSubmitNoParking = true;
    await installParkingFlowMocks(page, state);

    await page.goto(parkingFlowPaths.guestForm);
    await fillGuestParkingRegistrationForm(page);
    await page.getByRole('button', { name: 'Submit request' }).click();

    await expect(page.getByText('No parking slots are available for these dates')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${parkingFlowPaths.guestForm.replace(/\?/, '\\?')}$`));
  });

  test('links a marketplace request to a property stay when guest picks one', async ({ page }) => {
    setParkingScreenSuite('linkable-stay');
    const state = createParkingFlowState();
    await installParkingFlowMocks(page, state);

    await page.goto(parkingFlowPaths.guestForm);
    await expect(page.getByText('Which stay?')).toBeVisible();
    await expect(page.getByRole('button', { name: /Solea Mactan/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Aug 24-28, 2026/ })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Different booking — enter details' })
    ).toBeVisible();

    await page.getByRole('button', { name: /Solea Mactan/ }).click();
    await expect(page.getByText(parkingGuestStatusLabels.confirmRequest)).toBeVisible();
    await expect(page.getByText('Jamie Park')).toBeVisible();
    await expect(page.getByText(/ABC-1234/)).toBeVisible();

    await page.getByRole('button', { name: 'Submit request' }).click();

    await expect(page).toHaveURL(new RegExp(`/parkings/requests/`));
    expect(state.linkedPropertyBookingId).toBe('property-booking-e2e-001');
    await expect(
      page.getByRole('heading', { name: parkingGuestStatusLabels.findingHost })
    ).toBeVisible();
  });
});
