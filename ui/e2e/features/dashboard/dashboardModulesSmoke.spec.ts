import { expect, test } from '@playwright/test';

import {
  installPropertyTeamRbacMocks,
  openPropertyDashboard,
  teamRbacPaths,
} from '../team/shared/propertyTeamRbacHarness';

test.describe('@ci dashboard module shells', () => {
  test.describe.configure({ mode: 'serial' });

  test('property finance page loads for Full Access', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    const summaryReady = page.waitForResponse(
      (res) => res.url().includes('/functions/v1/finance-summary') && res.ok()
    );
    await page.goto('/org/kame-homes-ph/property/solea-mactan/finance');
    await summaryReady;
    await expect(page.getByRole('heading', { name: 'Finance' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('property dashboard loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    await openPropertyDashboard(page);
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('property maintenance page loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    await page.goto('/org/kame-homes-ph/property/solea-mactan/maintenance');
    await expect(page.getByRole('heading', { name: 'Maintenance' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('property pricing page loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    const pricingReady = page.waitForResponse(
      (res) => res.url().includes('/functions/v1/property-pricing') && res.ok()
    );
    await page.goto('/org/kame-homes-ph/property/solea-mactan/pricing');
    await pricingReady;
    await expect(page.getByRole('heading', { name: 'Pricing' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('property settings page loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    await page.goto('/org/kame-homes-ph/property/solea-mactan/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('property notifications page loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    await page.goto('/org/kame-homes-ph/property/solea-mactan/notifications');
    await expect(
      page.getByRole('heading', { name: 'Notifications', exact: true })
    ).toBeVisible({
      timeout: 20_000,
    });
  });

  test('property templates page loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    const templatesReady = page.waitForResponse(
      (res) => res.url().includes('/functions/v1/property-templates-settings') && res.ok()
    );
    await page.goto('/org/kame-homes-ph/property/solea-mactan/templates');
    await templatesReady;
    await expect(page.getByRole('heading', { name: 'Templates', exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Standard templates' })).toBeVisible();
  });

  test('property team page loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    const teamReady = page.waitForResponse(
      (res) => res.url().includes('/functions/v1/property-team-members') && res.ok()
    );
    await page.goto(teamRbacPaths.team);
    await teamReady;
    await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('property public pages shell loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    await page.goto(teamRbacPaths.publicPages);
    await expect(page.getByRole('heading', { name: 'Public Pages', exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'Design your pages' })).toBeVisible();
  });

  test('property activity log loads', async ({ page }) => {
    await installPropertyTeamRbacMocks(page, 'full_access');
    const activityReady = page.waitForResponse(
      (res) => res.url().includes('/functions/v1/list-activity-log') && res.ok()
    );
    await page.goto(teamRbacPaths.activity);
    await activityReady;
    await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('No activity in this range.')).toBeVisible();
  });
});
