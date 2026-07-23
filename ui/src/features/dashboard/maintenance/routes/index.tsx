import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { MaintenancePage } from '@/features/dashboard/maintenance/pages/MaintenancePage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function maintenancePropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="maintenance" element={propertyRoute('maintenance', <MaintenancePage />)} />;
}
