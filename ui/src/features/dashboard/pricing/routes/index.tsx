import type { ReactNode } from 'react';

import { Navigate, Route } from 'react-router-dom';

import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';
import { PropertyCalendarPage } from '@/features/dashboard/pricing/pages/PropertyCalendarPage';

export function pricingPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <>
      <Route path="calendar" element={propertyRoute('calendar', <PropertyCalendarPage />)} />
      <Route path="pricing" element={<Navigate to="../calendar?view=pricing" replace />} />
    </>
  );
}
