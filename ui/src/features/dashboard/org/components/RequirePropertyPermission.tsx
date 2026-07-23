import type { ReactNode } from 'react';

import { Navigate } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { TenantAccessDenied } from '@/features/dashboard/org/components/TenantAccessDenied';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import {
  hasPropertyPermission,
  PROPERTY_SECTION_VIEW_PERMISSION,
  type PropertySection,
} from '@/features/dashboard/team/lib/propertyPermissions';

type Props = {
  section: PropertySection;
  children: ReactNode;
};

export function RequirePropertyPermission({ section, children }: Props) {
  const { orgSlug, propertySlug } = useOrgContext();
  const { data, isLoading, isError } = usePropertyPermissions();
  const required = PROPERTY_SECTION_VIEW_PERMISSION[section];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isError || !data || !hasPropertyPermission(data.permissions, required)) {
    const fallback = findFirstAllowedSection(data?.permissions);
    if (fallback) {
      return <Navigate to={propertySectionPath(orgSlug, propertySlug, fallback)} replace />;
    }
    return (
      <TenantAccessDenied
        scope="property"
        orgSlug={orgSlug}
        propertySlug={propertySlug}
        propertyName={data?.propertyName}
      />
    );
  }

  return children;
}

const PROPERTY_SECTION_ORDER: readonly PropertySection[] = [
  'dashboard',
  'bookings',
  'finance',
  'pricing',
  'maintenance',
  'marketing',
  'notifications',
  'templates',
  'team',
  'settings',
];

function findFirstAllowedSection(
  permissions: readonly string[] | undefined
): PropertySection | null {
  if (!permissions?.length) return null;
  for (const section of PROPERTY_SECTION_ORDER) {
    const perm = PROPERTY_SECTION_VIEW_PERMISSION[section];
    if (hasPropertyPermission(permissions, perm)) {
      return section;
    }
  }
  return null;
}
