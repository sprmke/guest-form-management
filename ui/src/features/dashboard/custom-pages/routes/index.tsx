import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { CustomPagesPage } from '@/features/dashboard/custom-pages/pages/CustomPagesPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function customPagesPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="custom-pages" element={propertyRoute('custom-pages', <CustomPagesPage />)} />;
}
