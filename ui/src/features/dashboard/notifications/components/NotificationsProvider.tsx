import { useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import { useNotificationsRealtime } from '@/features/dashboard/notifications/hooks/useNotificationsRealtime';
import { resolveNotificationPath } from '@/features/dashboard/notifications/lib/notificationsPaths';
import { useNotificationsOrgScope } from '@/features/dashboard/notifications/lib/notificationsScope';
import { useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import { useParkings } from '@/features/dashboard/org/hooks/useParkings';

/**
 * Mounts the org-wide notifications realtime channel — no UI of its own.
 * Mount exactly once per admin session (AdminLayout), never per-page.
 */
export function NotificationsProvider() {
  const navigate = useNavigate();
  const { orgSlug, orgId } = useNotificationsOrgScope();

  // Cached by RequireOrgContext/SidebarTenantScope already mounted alongside —
  // this hits the TanStack Query cache rather than firing a fresh request.
  const { data: propertiesData } = useProperties(orgSlug ?? undefined);
  const { data: parkingsData } = useParkings(orgSlug ?? undefined);

  const propertySlugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of propertiesData?.properties ?? []) map.set(property.id, property.slug);
    return map;
  }, [propertiesData]);

  const parkingSlugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const parking of parkingsData?.parkings ?? []) map.set(parking.id, parking.slug);
    return map;
  }, [parkingsData]);

  useNotificationsRealtime(orgId, (row) => {
    const path = resolveNotificationPath(row, { orgSlug, propertySlugById, parkingSlugById });
    if (path) navigate(path);
  });

  return null;
}
