import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { FinancePage } from '@/features/dashboard/finance/pages/FinancePage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function financePropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return <Route path="finance" element={propertyRoute('finance', <FinancePage />)} />;
}
