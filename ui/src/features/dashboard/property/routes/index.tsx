import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';
import { DashboardPage } from '@/features/dashboard/property/pages/DashboardPage';

export function dashboardPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route index element={propertyRoute('dashboard', <DashboardPage />)} />;
}
