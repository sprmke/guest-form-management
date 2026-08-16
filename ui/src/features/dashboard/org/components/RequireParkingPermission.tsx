import type { ReactNode } from 'react';

import { Navigate } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { useParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { TenantAccessDenied } from '@/features/dashboard/org/components/TenantAccessDenied';
import { parkingSectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { useParkingPermissions } from '@/features/dashboard/team/hooks/useParkingPermissions';
import {
  hasParkingPermission,
  PARKING_SECTION_VIEW_PERMISSION,
  type ParkingSection,
} from '@/features/dashboard/team/lib/parkingPermissions';

type Props = {
  section: ParkingSection;
  children: ReactNode;
};

export function RequireParkingPermission({ section, children }: Props) {
  const { orgSlug, parking } = useParkingContext();
  const { data, isLoading, isError } = useParkingPermissions();
  const required = PARKING_SECTION_VIEW_PERMISSION[section];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isError || !data || !hasParkingPermission(data.permissions, required)) {
    const fallback = findFirstAllowedSection(data?.permissions);
    if (fallback) {
      return <Navigate to={parkingSectionPath(orgSlug, parking.slug, fallback)} replace />;
    }
    return (
      <TenantAccessDenied
        scope="property"
        orgSlug={orgSlug}
        propertySlug={parking.slug}
        propertyName={data?.parkingName ?? parking.name}
      />
    );
  }

  return children;
}

const PARKING_SECTION_ORDER: readonly ParkingSection[] = [
  'dashboard',
  'bookings',
  'finance',
  'pricing',
  'inbox',
  'notifications',
  'team',
  'settings',
];

function findFirstAllowedSection(
  permissions: readonly string[] | undefined
): ParkingSection | null {
  if (!permissions?.length) return null;
  for (const section of PARKING_SECTION_ORDER) {
    const perm = PARKING_SECTION_VIEW_PERMISSION[section];
    if (hasParkingPermission(permissions, perm)) {
      return section;
    }
  }
  return null;
}
