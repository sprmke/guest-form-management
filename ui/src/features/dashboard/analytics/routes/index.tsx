import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { PropertyAnalyticsPage } from '@/features/dashboard/analytics/pages/PropertyAnalyticsPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function analyticsPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="analytics" element={propertyRoute('analytics', <PropertyAnalyticsPage />)} />;
}
