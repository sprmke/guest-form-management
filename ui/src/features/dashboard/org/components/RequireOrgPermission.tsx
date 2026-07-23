import type { ReactNode } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { hostLoginPath } from '@/features/guest/auth/lib/hostAuthPaths';
import { useAdminSession } from '@/features/dashboard/bookings/hooks/useAdminSession';
import { PropertyMemberOrgRedirect } from '@/features/dashboard/org/components/PropertyMemberOrgRedirect';
import { TenantAccessDenied } from '@/features/dashboard/org/components/TenantAccessDenied';
import { useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';
import { isPropertyOnlyOrgAccess } from '@/features/dashboard/org/lib/orgAccessKind';
import { useOrgPermissions } from '@/features/dashboard/team/hooks/useOrgPermissions';
import {
  hasOrgPermission,
  orgSectionPath,
  ORG_SECTION_VIEW_PERMISSION,
  type OrgPermissionId,
} from '@/features/dashboard/team/lib/orgPermissions';

type Props = {
  section: keyof typeof ORG_SECTION_VIEW_PERMISSION;
  children: ReactNode;
};

export function RequireOrgPermission({ section, children }: Props) {
  const location = useLocation();
  const orgSlug = useOrgSlugParam();
  const { status: sessionStatus } = useAdminSession();
  const { data, isPending, isError } = useOrgPermissions();
  const required = ORG_SECTION_VIEW_PERMISSION[section];

  if (sessionStatus === 'loading' || (isPending && !data)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (sessionStatus === 'signed-out') {
    return <Navigate to={hostLoginPath(location.pathname + location.search)} replace />;
  }

  if (data && isPropertyOnlyOrgAccess(data.accessKind) && orgSlug) {
    return <PropertyMemberOrgRedirect orgSlug={orgSlug} />;
  }

  if (isError || !data || !orgSlug || !hasOrgPermission(data.permissions, required)) {
    if (!isError && orgSlug && data) {
      const fallback = findFirstAllowedOrgSection(data.permissions);
      if (fallback) {
        return <Navigate to={orgSectionPath(orgSlug, fallback)} replace />;
      }
    }
    return (
      <TenantAccessDenied scope="org" orgSlug={orgSlug ?? undefined} orgName={data?.orgName} />
    );
  }

  return children;
}

function findFirstAllowedOrgSection(
  permissions: readonly string[] | undefined
): keyof typeof ORG_SECTION_VIEW_PERMISSION | null {
  if (!permissions?.length) return null;
  for (const [section, perm] of Object.entries(ORG_SECTION_VIEW_PERMISSION)) {
    if (hasOrgPermission(permissions, perm as OrgPermissionId)) {
      return section as keyof typeof ORG_SECTION_VIEW_PERMISSION;
    }
  }
  return null;
}
