import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { PropertyPlansPage } from '@/features/dashboard/plans/pages/PropertyPlansPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function plansPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="plans" element={propertyRoute('plans', <PropertyPlansPage />)} />;
}
