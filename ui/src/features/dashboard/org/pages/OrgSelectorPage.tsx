import { Navigate } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { resolveOrgLandingPath } from '@/features/dashboard/org/lib/orgLanding';

/**
 * `/org` hub — no selector UI. Sends the user to their org dashboard (last-used or first)
 * or onboarding when they have no organizations.
 */
export function OrgSelectorPage() {
  const { data, isLoading, isError } = useOrganizations();

  return (
    <RequireAdmin>
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center" role="status">
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
        </div>
      ) : isError ? (
        <Navigate to="/onboarding" replace />
      ) : (
        <Navigate to={resolveOrgLandingPath(data?.organizations ?? [])} replace />
      )}
    </RequireAdmin>
  );
}
