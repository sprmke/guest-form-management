import { useQuery } from '@tanstack/react-query';

import { fetchAiDashboardAssistantSettings } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { useOrgScopeKey } from '@/features/dashboard/org/lib/adminApiScope';


const accessKey = (orgSlug: string | null, orgId: string | null) =>
  ['org', orgSlug ?? orgId, 'ai-dashboard-assistant-access'] as const;

/** Visible only when both kill-switch layers are on for this org (and, if given, this property isn't opted out). */
export function useAiAssistantAccess(propertyId?: string | null) {
  const { orgSlug, orgId } = useOrgScopeKey();

  const query = useQuery({
    queryKey: accessKey(orgSlug, orgId),
    enabled: Boolean(orgSlug || orgId),
    queryFn: () => fetchAiDashboardAssistantSettings(orgSlug, orgId),
    staleTime: 30_000,
    retry: false,
  });

  const settings = query.data;
  const propertyDisabled = Boolean(
    propertyId && settings?.disabledPropertyIds.includes(propertyId)
  );
  const accessible = Boolean(settings?.platformEnabled && settings?.enabled && !propertyDisabled);

  return { ...query, accessible, settings };
}
