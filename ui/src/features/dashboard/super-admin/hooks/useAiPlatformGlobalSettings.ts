import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';

export type AiPlatformGlobalSettingsDto = {
  enabled: boolean;
  enforceQuotas: boolean;
  allowedFeatures: string[];
  defaultDailyCallLimit: number;
  defaultMonthlyCallLimit: number;
  defaultDailyCostUsdLimit: number;
  creditUnitUsd: number;
  voiceReceptionistCostPerMinuteUsd: number;
  updatedAt: string | null;
};

export type AiPlatformGlobalSettingsPatch = {
  enabled?: boolean;
  enforceQuotas?: boolean;
  allowedFeatures?: string[];
  defaultDailyCallLimit?: number;
  defaultMonthlyCallLimit?: number;
  defaultDailyCostUsdLimit?: number;
  creditUnitUsd?: number;
  voiceReceptionistCostPerMinuteUsd?: number;
};

const QUERY_KEY = ['super-admin', 'ai-platform-global-settings'] as const;

export function useAiPlatformGlobalSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => callEdgeFunction<AiPlatformGlobalSettingsDto>('ai-platform-global-settings'),
  });
}

export function useUpdateAiPlatformGlobalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: AiPlatformGlobalSettingsPatch) =>
      callEdgeFunction<AiPlatformGlobalSettingsDto>('ai-platform-global-settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });
}
