import { chromium, expect, test, type Page } from '@playwright/test';

import {
  createParkingFlowState,
  installParkingFlowMocks,
  parkingFlowLabels,
  parkingFlowPaths,
  submitGuestParkingRequest,
} from '../shared/parkingFlowHarness';
import { captureParkingScreen, setParkingScreenSuite } from '../shared/parkingScreenCapture';

function readPositiveIntEnv(name: string): number {
  const raw = process.env[name];
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

async function demoPause(...pages: Page[]) {
  const pauseMs = readPositiveIntEnv('PLAYWRIGHT_DEMO_PAUSE_MS');
  if (!pauseMs) return;
  await Promise.all(pages.map((page) => page.waitForTimeout(pauseMs)));
}

test('guest and host can run the mocked parking flow side by side', async ({
  browserName,
}, testInfo) => {
  void browserName;
  const slowMo = readPositiveIntEnv('PLAYWRIGHT_SLOW_MO');
  const demoPauseMs = readPositiveIntEnv('PLAYWRIGHT_DEMO_PAUSE_MS');
  test.setTimeout(slowMo || demoPauseMs ? 180_000 : 60_000);
  test.skip(
    testInfo.project.name !== 'chromium-side-by-side',
    'Run this scenario with the chromium-side-by-side project.'
  );

  const state = createParkingFlowState();
  setParkingScreenSuite('side-by-side');
  const guestBrowser = await chromium.launch({
    headless: false,
    slowMo,
    args: ['--window-position=0,40', '--window-size=900,980'],
  });
  const hostBrowser = await chromium.launch({
    headless: false,
    slowMo,
    args: ['--window-position=920,40', '--window-size=900,980'],
  });

  try {
    const guestContext = await guestBrowser.newContext({ viewport: { width: 900, height: 960 } });
    const hostContext = await hostBrowser.newContext({ viewport: { width: 900, height: 960 } });
    const guestPage = await guestContext.newPage();
    const hostPage = await hostContext.newPage();

    await installParkingFlowMocks(guestPage, state);
    await installParkingFlowMocks(hostPage, state);

    await submitGuestParkingRequest(guestPage);
    await expect(guestPage.getByText('Waiting for a host')).toBeVisible();
    await captureParkingScreen(guestPage, 'guest-waiting', { role: 'guest' });
    await demoPause(guestPage, hostPage);

    if (process.env.PLAYWRIGHT_INSPECT === '1') {
      await guestPage.pause();
    }

    await hostPage.goto(parkingFlowPaths.hostBookings);
    await captureParkingScreen(hostPage, 'host-bookings-list', { role: 'host' });
    await demoPause(hostPage);
    await hostPage.getByRole('button', { name: 'Open booking for Jamie Park' }).click();
    await captureParkingScreen(hostPage, 'host-booking-detail-pending', { role: 'host' });
    await demoPause(hostPage);
    await hostPage
      .getByLabel(parkingFlowLabels.accessInstructions)
      .fill('Use the Tower 1 ramp and show this request at the guard.');
    await hostPage.getByRole('button', { name: parkingFlowLabels.accept }).click();
    await captureParkingScreen(hostPage, 'host-booking-accepted', { role: 'host' });
    await demoPause(hostPage, guestPage);

    await guestPage.reload();
    await expect(guestPage.getByText('Accepted')).toBeVisible();
    await captureParkingScreen(guestPage, 'guest-accepted', { role: 'guest' });
    await demoPause(guestPage, hostPage);
    await expect(guestPage.getByText('Slot: Tower 1 · B2 · 12A')).toBeVisible();
    await expect(
      guestPage.getByText('Use the Tower 1 ramp and show this request at the guard.')
    ).toBeVisible();
    await expect(hostPage.getByText('Pending Review')).toBeVisible();
    await captureParkingScreen(guestPage, 'guest-accepted-final', { role: 'guest' });
    await captureParkingScreen(hostPage, 'host-pending-review-final', { role: 'host' });
  } finally {
    await guestBrowser.close();
    await hostBrowser.close();
  }
});
