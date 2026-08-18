import type { ReactNode } from 'react';

import { Navigate, Route } from 'react-router-dom';

import { CustomPagesPage } from '@/features/dashboard/custom-pages/pages/CustomPagesPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function customPagesPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <>
      <Route path="public-pages" element={propertyRoute('public-pages', <CustomPagesPage />)} />
      <Route path="custom-pages" element={<Navigate to="../public-pages" replace />} />
    </>
  );
}
