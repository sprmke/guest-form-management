import { useQuery } from '@tanstack/react-query';

import { fetchAiDashboardAssistantSettings } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';
import { useOrgScopeKey } from '@/features/dashboard/org/lib/adminApiScope';

const accessKey = (orgSlug: string | null, orgId: string | null) =>
  ['org', orgSlug ?? orgId, 'ai-dashboard-assistant-access'] as const;

/** Visible when kill-switch layers and plan tier allow assistant for this property. */
export function useAiAssistantAccess(propertyId?: string | null) {
  const { orgSlug, orgId } = useOrgScopeKey();
  const planGate = useFeatureGate('aiDashboardAssistant', propertyId);

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
  const accessible = Boolean(
    settings?.platformEnabled && settings?.enabled && !propertyDisabled && planGate.allowed
  );

  return { ...query, accessible, settings, planGate };
}
