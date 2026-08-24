import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { HelpSupportLayout } from '@/features/dashboard/help-support/components/HelpSupportLayout';
import { helpSupportOrgNestedRoutes } from '@/features/dashboard/help-support/routes';
import { OrgInboxRedirect } from '@/features/dashboard/inbox/routes';
import { LegacyAdminRedirect } from '@/features/dashboard/org/components/LegacyAdminRedirect';
import { OrgAdminShell } from '@/features/dashboard/org/components/OrgAdminShell';
import { ParkingAdminShell } from '@/features/dashboard/org/components/ParkingAdminShell';
import { PropertyAdminShell } from '@/features/dashboard/org/components/PropertyAdminShell';
import { HostVerificationRejectedRoutePage } from '@/features/dashboard/org/pages/HostVerificationRejectedRoutePage';
import { OnboardingPage } from '@/features/dashboard/org/pages/OnboardingPage';
import { OrgBookingsPage } from '@/features/dashboard/org/pages/OrgBookingsPage';
import { OrgDashboardPage } from '@/features/dashboard/org/pages/OrgDashboardPage';
import { OrgParkingsPage } from '@/features/dashboard/org/pages/OrgParkingsPage';
import { OrgPropertiesPage } from '@/features/dashboard/org/pages/OrgPropertiesPage';
import { OrgSelectorPage } from '@/features/dashboard/org/pages/OrgSelectorPage';
import { OrgSettingsPage } from '@/features/dashboard/org/pages/OrgSettingsPage';
import type { OrgRouteFn } from '@/features/dashboard/org/routes/guards';
import { OrgPlansPage } from '@/features/dashboard/plans/pages/OrgPlansPage';
import { OrgTeamPage } from '@/features/dashboard/team/pages/OrgTeamPage';

export const orgOnboardingRoutes: ReactNode = (
  <>
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route path="/org" element={<OrgSelectorPage />} />
    <Route path="/verification-rejected" element={<HostVerificationRejectedRoutePage />} />
  </>
);

export function orgAdminRoutes(orgRoute: OrgRouteFn): ReactNode {
  return (
    <Route path="/org/:orgSlug" element={<OrgAdminShell />}>
      <Route path="dashboard" element={orgRoute('dashboard', <OrgDashboardPage />)} />
      <Route path="bookings" element={orgRoute('bookings', <OrgBookingsPage />)} />
      <Route path="settings" element={orgRoute('settings', <OrgSettingsPage />)} />
      <Route path="properties" element={orgRoute('properties', <OrgPropertiesPage />)} />
      <Route path="parkings" element={orgRoute('parkings', <OrgParkingsPage />)} />
      <Route path="team" element={orgRoute('team', <OrgTeamPage />)} />
      <Route path="plans" element={orgRoute('plans', <OrgPlansPage />)} />
      <Route path="inbox" element={<OrgInboxRedirect />} />
      <Route path="help-support" element={orgRoute('help-support', <HelpSupportLayout />)}>
        {helpSupportOrgNestedRoutes()}
      </Route>
    </Route>
  );
}

/** @deprecated Use orgAdminRoutes — kept for imports during migration. */
export function orgScopedRoutes(orgRoute: OrgRouteFn): ReactNode {
  return orgAdminRoutes(orgRoute);
}

export function parkingShellRoute(parkingChildren: ReactNode): ReactNode {
  return (
    <Route path="/org/:orgSlug/parking/:parkingSlug" element={<ParkingAdminShell />}>
      {parkingChildren}
    </Route>
  );
}

export function propertyShellRoute(propertyChildren: ReactNode): ReactNode {
  return (
    <Route path="/org/:orgSlug/property/:propertySlug" element={<PropertyAdminShell />}>
      {propertyChildren}
    </Route>
  );
}

export const legacyAdminRedirects: ReactNode = (
  <>
    <Route path="/dashboard" element={<LegacyAdminRedirect toSection="dashboard" />} />
    <Route path="/bookings" element={<LegacyAdminRedirect toSection="bookings" />} />
    <Route path="/bookings/:bookingId" element={<LegacyAdminRedirect toSection="bookings" />} />
    <Route path="/finance" element={<LegacyAdminRedirect toSection="finance" />} />
    <Route path="/maintenance" element={<LegacyAdminRedirect toSection="maintenance" />} />
    <Route path="/notifications" element={<LegacyAdminRedirect toSection="notifications" />} />
    <Route path="/marketing" element={<LegacyAdminRedirect toSection="marketing" />} />
    <Route path="/staff" element={<LegacyAdminRedirect toSection="staff" />} />
    <Route path="/operations" element={<LegacyAdminRedirect toSection="operations" />} />
    <Route path="/settings" element={<LegacyAdminRedirect toSection="settings" />} />
  </>
);
