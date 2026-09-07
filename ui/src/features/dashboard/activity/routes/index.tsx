import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { ActivityLogPage } from '@/features/dashboard/activity/pages/ActivityLogPage';
import type { ParkingRouteFn, PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function activityPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <Route
      path="activity"
      element={propertyRoute('activity', <ActivityLogPage scope="property" />)}
    />
  );
}

export function activityParkingRoute(parkingRoute: ParkingRouteFn): ReactNode {
  return (
    <Route
      path="activity"
      element={parkingRoute('activity', <ActivityLogPage scope="parking" />)}
    />
  );
}
