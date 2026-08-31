import { expect, test } from '@playwright/test';

import { createParkingFlowState } from '../shared/parkingFlowHarness';
import { captureParkingScreen, setParkingScreenSuite } from '../shared/parkingScreenCapture';
import {
  createPropertyBookingParkingState,
  installPropertyBookingParkingMocks,
  PROPERTY_BOOKING_ID,
  propertyBookingParkingPaths,
} from '../shared/propertyBookingParkingHarness';

async function openPropertyBookingDetail(page: import('@playwright/test').Page) {
  await page.goto(propertyBookingParkingPaths.bookingDetail);
  await expect(page.getByRole('heading', { name: 'Maria Santos' })).toBeVisible({
    timeout: 15_000,
  });
}

async function expandAutomationTriggers(page: import('@playwright/test').Page) {
  const triggers = page.getByRole('button', { name: /Automation Triggers/i });
  await expect(triggers).toBeVisible({ timeout: 15_000 });
  if ((await triggers.getAttribute('aria-expanded')) !== 'true') {
    await triggers.click();
  }
  await expect(triggers).toHaveAttribute('aria-expanded', 'true');
}

test.describe('property booking Free-tier manual workflow', () => {
  test('Automation Triggers shows Send manually and sends GAF, ack, parking emails', async ({
    page,
  }) => {
    setParkingScreenSuite('property-free-manual-workflow-sends');
    const parkingState = createParkingFlowState();
    const propertyState = createPropertyBookingParkingState({ linked: false });
    const workflow = await installPropertyBookingParkingMocks(page, parkingState, propertyState, {
      freePlan: true,
      bookingOverrides: {
        status: 'PENDING_DOCUMENTS',
        need_parking: true,
        gaf_request_pdf_url: 'https://example.com/e2e-gaf-request.pdf',
      },
    });

    await openPropertyBookingDetail(page);
    await captureParkingScreen(page, 'booking-detail-free');

    await expect(page.getByText('Send manually', { exact: true })).toBeVisible();
    await expandAutomationTriggers(page);
    await expect(
      page.getByText('Automated workflow emails are not included on your plan', { exact: false })
    ).toBeVisible();
    await captureParkingScreen(page, 'automation-triggers-expanded');

    await page.getByRole('button', { name: 'Send GAF request' }).click();
    await expect(page.getByText('GAF request email sent')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Send Booking acknowledgement' }).click();
    await expect(page.getByText('Booking acknowledgement email sent')).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: 'Send Parking broadcast' }).click();
    await expect(page.getByText('Parking broadcast email sent')).toBeVisible({ timeout: 10_000 });
    await captureParkingScreen(page, 'after-manual-sends');

    expect(workflow.workflowEmailsSent.map((entry) => entry.kind)).toEqual([
      'gaf_request',
      'booking_acknowledgement',
      'parking_broadcast',
    ]);
    expect(
      workflow.workflowEmailsSent.every((entry) => entry.bookingId === PROPERTY_BOOKING_ID)
    ).toBe(true);

    // Parking marketplace path still available from More actions while Free + unlinked.
    await page.getByRole('button', { name: 'More actions' }).click();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('menuitem', { name: 'Find parking' }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(new RegExp(`/parkings\\?.*linkStay=${PROPERTY_BOOKING_ID}`));
  });

  test('Proceed skips plan-gated emails, toasts, and expands Automation Triggers', async ({
    page,
  }) => {
    setParkingScreenSuite('property-free-manual-workflow-proceed-skip');
    const parkingState = createParkingFlowState();
    const propertyState = createPropertyBookingParkingState({ linked: false });
    const workflow = await installPropertyBookingParkingMocks(page, parkingState, propertyState, {
      freePlan: true,
      bookingOverrides: {
        status: 'PENDING_REVIEW',
        need_parking: true,
        gaf_request_pdf_url: null,
      },
    });

    await openPropertyBookingDetail(page);
    await captureParkingScreen(page, 'pending-review');

    await page
      .getByLabel(
        'I manually reviewed and confirmed that all details, documents, and receipts are correct.'
      )
      .click();

    await expect(page.getByText('Review pricing')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Proceed to Pending Documents/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: /Proceed to Pending Documents/i }).click();

    const confirm = page.getByRole('button', { name: 'Confirm' });
    await expect(confirm).toBeVisible({ timeout: 10_000 });
    await captureParkingScreen(page, 'proceed-confirm');
    await confirm.click();

    await expect(page.getByText(/Not sent automatically on your plan/i)).toBeVisible({
      timeout: 10_000,
    });
    await captureParkingScreen(page, 'plan-skip-toast');

    expect(workflow.lastTransition?.toStatus).toBe('PENDING_DOCUMENTS');
    expect(workflow.booking.status).toBe('PENDING_DOCUMENTS');

    const triggers = page.getByRole('button', { name: /Automation Triggers/i });
    await expect(triggers).toBeVisible({ timeout: 10_000 });
    await expect(triggers).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Send manually', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send GAF request' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Booking acknowledgement' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Parking broadcast' })).toBeVisible();
    await captureParkingScreen(page, 'triggers-auto-expanded');
  });

  test('READY_FOR_CHECKIN Free plan can send ready + check-out instruction emails', async ({
    page,
  }) => {
    setParkingScreenSuite('property-free-manual-workflow-rfci');
    const parkingState = createParkingFlowState();
    const propertyState = createPropertyBookingParkingState({ linked: true });
    const workflow = await installPropertyBookingParkingMocks(page, parkingState, propertyState, {
      freePlan: true,
      bookingOverrides: {
        status: 'READY_FOR_CHECKIN',
        need_parking: true,
        gaf_request_pdf_url: 'https://example.com/e2e-gaf-request.pdf',
      },
    });

    await openPropertyBookingDetail(page);
    await expandAutomationTriggers(page);
    await captureParkingScreen(page, 'rfci-triggers');

    await page.getByRole('button', { name: 'Send Ready for check-in' }).click();
    await expect(page.getByText('Ready for check-in email sent')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Send Check-out Instructions' }).click();
    await expect(page.getByText('Check-out Instructions email sent')).toBeVisible({
      timeout: 10_000,
    });

    expect(workflow.workflowEmailsSent.map((entry) => entry.kind)).toEqual([
      'ready_for_checkin',
      'sd_refund_form_request',
    ]);
  });
});
