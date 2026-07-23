import { useMemo } from 'react';

import { useAppSettings } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useGmailMailIntegrationStatus } from '@/features/dashboard/bookings/hooks/useGmailMailIntegration';
import type { DashboardAttentionItem } from '@/features/dashboard/property/lib/types';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';

export function usePropertyGoogleAttentionItem(): DashboardAttentionItem | null {
  const { orgSlug, propertySlug } = useOrgContext();
  const { data: settings, isLoading: settingsLoading } = useAppSettings();
  const { data: gmail, isLoading: gmailLoading } = useGmailMailIntegrationStatus();

  return useMemo(() => {
    if (settingsLoading || gmailLoading) return null;

    const integrations = settings?.propertyIntegrations;
    const googleReady =
      (gmail?.connected ?? false) &&
      (integrations?.googleCalendar.configured ?? false) &&
      (integrations?.googleSpreadsheet.configured ?? false);

    if (googleReady) return null;

    return {
      id: 'connect-google',
      label: 'Connect Google',
      href: propertySectionPath(orgSlug, propertySlug, 'settings'),
      severity: 'warning',
    };
  }, [
    settingsLoading,
    gmailLoading,
    settings?.propertyIntegrations,
    gmail?.connected,
    orgSlug,
    propertySlug,
  ]);
}
