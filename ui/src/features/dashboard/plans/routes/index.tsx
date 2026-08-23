import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';
import { PropertyPlansPage } from '@/features/dashboard/plans/pages/PropertyPlansPage';

export function plansPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="plans" element={propertyRoute('plans', <PropertyPlansPage />)} />;
}
