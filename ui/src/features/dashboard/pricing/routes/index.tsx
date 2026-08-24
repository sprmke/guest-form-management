import type { ReactNode } from 'react';

import { Navigate, Route } from 'react-router-dom';

import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';
import { PropertyPricingPage } from '@/features/dashboard/pricing/pages/PropertyPricingPage';

export function pricingPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <>
      <Route path="pricing" element={propertyRoute('pricing', <PropertyPricingPage />)} />
      <Route path="calendar" element={<Navigate to="../pricing" replace />} />
    </>
  );
}
