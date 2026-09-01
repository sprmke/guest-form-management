import { useParams } from 'react-router-dom';

import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';

/** True when the current admin scope has a dedicated announcements archive (property or parking). */
export function useHasHostAnnouncementsArchiveScope(): boolean {
  const orgContext = useOptionalOrgContext();
  const parkingContext = useOptionalParkingContext();
  return Boolean(orgContext ?? parkingContext);
}

/** Base `/announcements` path for property or parking admin scope (not org portfolio). */
export function useHostAnnouncementsBasePath(): string | null {
  const { orgSlug: routeOrgSlug } = useParams<{ orgSlug?: string }>();
  const orgContext = useOptionalOrgContext();
  const parkingContext = useOptionalParkingContext();
  const orgSlug = orgContext?.orgSlug ?? parkingContext?.orgSlug ?? routeOrgSlug ?? null;
  if (!orgSlug) return null;

  if (parkingContext) {
    return `/org/${orgSlug}/parking/${parkingContext.parkingSlug}/announcements`;
  }
  if (orgContext) {
    return `/org/${orgSlug}/property/${orgContext.propertySlug}/announcements`;
  }
  return null;
}

/** Map legacy Help & Support announcements URLs to the dedicated route (property/parking only). */
export function hostAnnouncementsPathFromHelpSupport(helpSupportPath: string): string {
  return helpSupportPath.replace(/\/help-support\/?$/, '/announcements');
}

/** Host archive route — not super-admin `/admin/announcements`. */
export function isHostAnnouncementsArchivePath(pathname: string): boolean {
  return pathname.includes('/announcements') && !pathname.startsWith('/admin');
}
