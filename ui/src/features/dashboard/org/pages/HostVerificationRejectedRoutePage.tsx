import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import {
  isHostVerificationHardRejected,
  readOrgVerificationDetail,
} from '@/features/dashboard/org/lib/orgVerificationTiers';
import { resolveOrgLandingPath } from '@/features/dashboard/org/lib/orgLanding';
import { HostVerificationRejectedPage } from '@/features/dashboard/org/pages/HostVerificationRejectedPage';

import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

/**
 * Hub for hard-rejected hosts after login (`/verification-rejected`).
 * If they somehow have an accessible org, send them there instead.
 */
export function HostVerificationRejectedRoutePage() {
  const { data, isLoading, isError } = useOrganizations();
  const organizations = data?.organizations ?? [];

  if (isLoading) {
    return (
      <RequireAdmin>
        <div className="flex min-h-[40vh] items-center justify-center" role="status">
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
        </div>
      </RequireAdmin>
    );
  }

  if (isError) {
    return (
      <RequireAdmin>
        <HostVerificationRejectedPage />
      </RequireAdmin>
    );
  }

  const landing = resolveOrgLandingPath(organizations);
  if (landing !== '/verification-rejected') {
    return (
      <RequireAdmin>
        <Navigate to={landing} replace />
      </RequireAdmin>
    );
  }

  const rejected =
    organizations.find((org) => isHostVerificationHardRejected(org.settings)) ?? organizations[0];
  const detail = rejected ? readOrgVerificationDetail(rejected.settings) : null;

  return (
    <RequireAdmin>
      <HostVerificationRejectedPage
        organizationName={rejected?.name}
        rejectionReason={detail?.baseRejectionReason}
      />
    </RequireAdmin>
  );
}
