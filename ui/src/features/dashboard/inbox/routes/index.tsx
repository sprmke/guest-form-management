import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { OrgInboxPage } from '@/features/dashboard/inbox/pages/OrgInboxPage';
import { ParkingInboxPage } from '@/features/dashboard/inbox/pages/ParkingInboxPage';
import { PropertyInboxPage } from '@/features/dashboard/inbox/pages/PropertyInboxPage';
import type {
  OrgRouteFn,
  ParkingRouteFn,
  PropertyRouteFn,
} from '@/features/dashboard/org/routes/guards';

export function orgInboxRoute(orgRoute: OrgRouteFn): ReactNode {
  return <Route path="/org/:orgSlug/inbox" element={orgRoute('inbox', <OrgInboxPage />)} />;
}

export function propertyInboxRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="inbox" element={propertyRoute('inbox', <PropertyInboxPage />)} />;
}

export function parkingInboxRoute(parkingRoute: ParkingRouteFn): ReactNode {
  return <Route path="inbox" element={parkingRoute('inbox', <ParkingInboxPage />)} />;
}
