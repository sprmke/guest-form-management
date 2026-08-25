import type { ReactNode } from 'react';

import { Navigate, Route, useParams } from 'react-router-dom';

import { orgPlansPath } from '@/features/dashboard/org/lib/tenantPaths';

/** Property `/plans` → org Plans & Billing (billing is org-level only). */
function PropertyPlansToOrgRedirect() {
  const { orgSlug } = useParams();
  if (!orgSlug) return <Navigate to="/" replace />;
  return <Navigate to={orgPlansPath(orgSlug)} replace />;
}

export function propertyPlansRedirectRoute(): ReactNode {
  return <Route path="plans" element={<PropertyPlansToOrgRedirect />} />;
}
