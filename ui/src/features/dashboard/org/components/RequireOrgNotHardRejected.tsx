import { Navigate, useParams } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import {
  isHostVerificationHardRejected,
  readOrgVerificationDetail,
} from '@/features/dashboard/org/lib/orgVerificationTiers';
import { HostVerificationRejectedPage } from '@/features/dashboard/org/pages/HostVerificationRejectedPage';

type Props = {
  children: React.ReactNode;
};

/** Blocks org/property/parking shells when Tier 1 verification was hard-rejected. */
export function RequireOrgNotHardRejected({ children }: Props) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const orgsQuery = useOrganizations();

  if (orgsQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!orgSlug) {
    return <Navigate to="/org" replace />;
  }

  const org = orgsQuery.data?.organizations.find((entry) => entry.slug === orgSlug);
  if (!org) {
    return <>{children}</>;
  }

  if (isHostVerificationHardRejected(org.settings)) {
    const detail = readOrgVerificationDetail(org.settings);
    return (
      <HostVerificationRejectedPage
        organizationName={org.name}
        rejectionReason={detail.baseRejectionReason}
      />
    );
  }

  return <>{children}</>;
}
