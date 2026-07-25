import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { DashboardPage } from '@/features/dashboard/property/pages/DashboardPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function dashboardPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route index element={propertyRoute('dashboard', <DashboardPage />)} />;
}
