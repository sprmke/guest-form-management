import type { ReactNode } from 'react';

import { Navigate, Route, useParams } from 'react-router-dom';

import { ParkingInboxPage } from '@/features/dashboard/inbox/pages/ParkingInboxPage';
import { PropertyInboxPage } from '@/features/dashboard/inbox/pages/PropertyInboxPage';
import { orgPropertiesPath } from '@/features/dashboard/org/lib/tenantPaths';
import type { ParkingRouteFn, PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

/** Legacy org inbox → properties (pick a property to open Guest Inbox). */
export function OrgInboxRedirect() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return <Navigate to={orgSlug ? orgPropertiesPath(orgSlug) : '/'} replace />;
}

export function propertyInboxRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="inbox" element={propertyRoute('inbox', <PropertyInboxPage />)} />;
}

export function parkingInboxRoute(parkingRoute: ParkingRouteFn): ReactNode {
  return <Route path="inbox" element={parkingRoute('inbox', <ParkingInboxPage />)} />;
}
