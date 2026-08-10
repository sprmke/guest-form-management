import { useMemo } from 'react';

import { useGmailMailIntegrationStatus } from '@/features/dashboard/bookings/hooks/useGmailMailIntegration';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import type { DashboardAttentionItem } from '@/features/dashboard/property/lib/types';

export function usePropertyGoogleAttentionItem(): DashboardAttentionItem | null {
  const { orgSlug, propertySlug } = useOrgContext();
  const { data: gmail, isLoading: gmailLoading } = useGmailMailIntegrationStatus();

  return useMemo(() => {
    if (gmailLoading) return null;

    if (gmail?.connected) return null;

    return {
      id: 'connect-google',
      label: 'Connect Google',
      href: propertySectionPath(orgSlug, propertySlug, 'settings'),
      severity: 'warning',
    };
  }, [gmailLoading, gmail?.connected, orgSlug, propertySlug]);
}
