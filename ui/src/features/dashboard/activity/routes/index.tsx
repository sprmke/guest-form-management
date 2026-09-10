import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { ActivityLogRedirect } from '@/features/dashboard/activity/pages/ActivityLogRedirect';
import type { ParkingRouteFn, PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function activityPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <Route
      path="activity"
      element={propertyRoute('activity', <ActivityLogRedirect scope="property" />)}
    />
  );
}

export function activityParkingRoute(parkingRoute: ParkingRouteFn): ReactNode {
  return (
    <Route
      path="activity"
      element={parkingRoute('activity', <ActivityLogRedirect scope="parking" />)}
    />
  );
}
