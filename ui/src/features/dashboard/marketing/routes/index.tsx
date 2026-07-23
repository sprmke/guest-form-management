import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { MarketingStudioPage } from '@/features/dashboard/marketing/pages/MarketingStudioPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function marketingPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="marketing" element={propertyRoute('marketing', <MarketingStudioPage />)} />;
}
