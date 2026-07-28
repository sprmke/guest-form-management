import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import type {
  OrgRouteFn,
  ParkingRouteFn,
  PropertyRouteFn,
} from '@/features/dashboard/org/routes/guards';
import { AcceptInvitePage } from '@/features/dashboard/team/pages/AcceptInvitePage';
import { OrgTeamPage } from '@/features/dashboard/team/pages/OrgTeamPage';
import { ParkingTeamPage } from '@/features/dashboard/team/pages/ParkingTeamPage';
import { PropertyTeamPage } from '@/features/dashboard/team/pages/PropertyTeamPage';

export const teamAuthRoutes: ReactNode = (
  <Route key="accept-invite" path="/accept-invite" element={<AcceptInvitePage />} />
);

export function orgTeamRoute(orgRoute: OrgRouteFn): ReactNode {
  return <Route path="/org/:orgSlug/team" element={orgRoute('team', <OrgTeamPage />)} />;
}

export function propertyTeamRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="team" element={propertyRoute('team', <PropertyTeamPage />)} />;
}

export function parkingTeamRoute(parkingRoute: ParkingRouteFn): ReactNode {
  return <Route path="team" element={parkingRoute('team', <ParkingTeamPage />)} />;
}
