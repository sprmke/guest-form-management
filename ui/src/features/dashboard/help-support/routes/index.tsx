import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { HelpSupportLayout } from '@/features/dashboard/help-support/components/HelpSupportLayout';
import { helpSupportAnnouncementsRedirectRoute } from '@/features/dashboard/announcements/routes';
import { HelpDocumentationPage } from '@/features/dashboard/help-support/pages/HelpDocumentationPage';
import { HelpSupportOverviewPage } from '@/features/dashboard/help-support/pages/HelpSupportOverviewPage';
import { TicketsWorkspacePage } from '@/features/dashboard/help-support/pages/TicketsWorkspacePage';
import type { ParkingRouteFn, PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

function helpSupportNestedRoutes(): ReactNode {
  return (
    <>
      <Route index element={<HelpSupportOverviewPage />} />
      <Route path="docs" element={<HelpDocumentationPage />} />
      {helpSupportAnnouncementsRedirectRoute()}
      <Route path="tickets/*" element={<TicketsWorkspacePage />} />
    </>
  );
}

export function helpSupportPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <Route path="help-support" element={propertyRoute('help-support', <HelpSupportLayout />)}>
      {helpSupportNestedRoutes()}
    </Route>
  );
}

export function helpSupportParkingRoute(parkingRoute: ParkingRouteFn): ReactNode {
  return (
    <Route path="help-support" element={parkingRoute('help-support', <HelpSupportLayout />)}>
      {helpSupportNestedRoutes()}
    </Route>
  );
}

export function helpSupportOrgNestedRoutes(): ReactNode {
  return helpSupportNestedRoutes();
}
