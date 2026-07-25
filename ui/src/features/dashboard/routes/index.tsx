import { Fragment } from 'react';
import type { ReactNode } from 'react';

import { adminPropertyRoutes } from '@/features/dashboard/bookings/routes/propertyRoutes';
import { dashboardPropertyRoute } from '@/features/dashboard/property/routes';
import { financePropertyRoute } from '@/features/dashboard/finance/routes';
import { maintenancePropertyRoute } from '@/features/dashboard/maintenance/routes';
import { marketingPropertyRoute } from '@/features/dashboard/marketing/routes';
import {
  legacyAdminRedirects,
  orgAdminRoutes,
  orgOnboardingRoutes,
  parkingShellRoute,
  propertyShellRoute,
} from '@/features/dashboard/org/routes';
import { orgRoute, parkingRoute, propertyRoute } from '@/features/dashboard/org/routes/guards';
import { parkingAdminRoutes } from '@/features/dashboard/parking/routes';
import { pricingPropertyRoute } from '@/features/dashboard/pricing/routes';
import {
  parkingTeamRoute,
  propertyTeamRoute,
  teamAuthRoutes,
} from '@/features/dashboard/team/routes';
import { superAdminRoutes } from '@/features/dashboard/super-admin/routes';

/** Dashboard / admin routes: org, property shell, bookings, finance, etc. */
export const dashboardRoutes: ReactNode[] = [
  superAdminRoutes,
  teamAuthRoutes,
  <Fragment key="org-onboarding">{orgOnboardingRoutes}</Fragment>,
  <Fragment key="org-admin">{orgAdminRoutes(orgRoute)}</Fragment>,
  <Fragment key="property-shell">
    {propertyShellRoute(
      <>
        {dashboardPropertyRoute(propertyRoute)}
        {adminPropertyRoutes(propertyRoute)}
        {financePropertyRoute(propertyRoute)}
        {pricingPropertyRoute(propertyRoute)}
        {maintenancePropertyRoute(propertyRoute)}
        {marketingPropertyRoute(propertyRoute)}
        {propertyTeamRoute(propertyRoute)}
      </>
    )}
  </Fragment>,
  <Fragment key="parking-shell">
    {parkingShellRoute(
      <>
        {parkingAdminRoutes()}
        {parkingTeamRoute(parkingRoute)}
      </>
    )}
  </Fragment>,
  <Fragment key="legacy-admin">{legacyAdminRedirects}</Fragment>,
];

/** @deprecated Use `dashboardRoutes` */
export const adminRoutes = dashboardRoutes;
