import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { PropertyPricingPage } from '@/features/dashboard/pricing/pages/PropertyPricingPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function pricingPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="pricing" element={propertyRoute('pricing', <PropertyPricingPage />)} />;
}
