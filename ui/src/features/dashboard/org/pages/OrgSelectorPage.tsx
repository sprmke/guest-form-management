import { Navigate } from 'react-router-dom';

import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { resolveOrgLandingPath } from '@/features/dashboard/org/lib/orgLanding';

import { RouteGuardSkeleton } from '@/components/skeletons/AdminSkeletons';

/**
 * `/org` hub — no selector UI. Sends the user to their org dashboard (last-used or first)
 * or onboarding when they have no organizations.
 */
export function OrgSelectorPage() {
  const { data, isLoading, isError } = useOrganizations();

  return (
    <RequireAdmin>
      {isLoading ? (
        <RouteGuardSkeleton fullScreen />
      ) : isError ? (
        <Navigate to="/onboarding" replace />
      ) : (
        <Navigate to={resolveOrgLandingPath(data?.organizations ?? [])} replace />
      )}
    </RequireAdmin>
  );
}
