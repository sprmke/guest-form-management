import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchAiDashboardAssistantGlobalSettings,
  fetchAiDashboardAssistantSettings,
  updateAiDashboardAssistantGlobalSettings,
  updateAiDashboardAssistantSettings,
  type AiDashboardAssistantOrgSettings,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { useOrgScopeKey } from '@/features/dashboard/org/lib/adminApiScope';


const settingsKey = (orgSlug: string | null, orgId: string | null) =>
  ['org', orgSlug ?? orgId, 'ai-dashboard-assistant-settings'] as const;
const globalSettingsKey = ['super-admin', 'ai-dashboard-assistant-global-settings'] as const;

export function useAiDashboardAssistantSettings() {
  const { orgSlug, orgId } = useOrgScopeKey();
  return useQuery({
    queryKey: settingsKey(orgSlug, orgId),
    enabled: Boolean(orgSlug || orgId),
    queryFn: () => fetchAiDashboardAssistantSettings(orgSlug, orgId),
  });
}

export function useUpdateAiDashboardAssistantSettings() {
  const { orgSlug, orgId } = useOrgScopeKey();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      enabled?: boolean;
      disabledPropertyIds?: string[];
      dailyMessageLimit?: number;
      monthlyMessageLimit?: number;
      dailyWriteActionLimit?: number;
    }) => updateAiDashboardAssistantSettings(orgSlug, orgId, patch),
    onSuccess: (data: AiDashboardAssistantOrgSettings) => {
      qc.setQueryData(settingsKey(orgSlug, orgId), data);
    },
  });
}

export function useAiDashboardAssistantGlobalSettings() {
  return useQuery({
    queryKey: globalSettingsKey,
    queryFn: fetchAiDashboardAssistantGlobalSettings,
  });
}

export function useUpdateAiDashboardAssistantGlobalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { enabled?: boolean }) => updateAiDashboardAssistantGlobalSettings(patch),
    onSuccess: (data) => {
      qc.setQueryData(globalSettingsKey, data);
    },
  });
}
