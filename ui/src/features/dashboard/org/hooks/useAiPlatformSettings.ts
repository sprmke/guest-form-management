import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { scopedOrgFunctionsUrl, useOrgScopeKey } from '@/features/dashboard/org/lib/adminApiScope';

import { supabase } from '@/lib/supabase/client';

export type AiPlatformOrgSettingsDto = {
  organizationId: string;
  enabled: boolean;
  dailyCallLimit: number;
  monthlyCallLimit: number;
  planTier: string;
  updatedAt: string | null;
};

export type AiPlatformUsageSummaryDto = {
  todayCallCount: number;
  monthCallCount: number;
  todayEstimatedCostUsd: number;
  monthEstimatedCostUsd: number;
  dailyCallLimit: number;
  monthlyCallLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  planTier: string;
  quotaExceeded: boolean;
};

const settingsKey = (orgSlug: string | null, orgId: string | null) =>
  ['org', orgSlug ?? orgId, 'ai-platform-settings'] as const;
const usageKey = (orgSlug: string | null, orgId: string | null) =>
  ['org', orgSlug ?? orgId, 'ai-platform-usage'] as const;

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

async function fetchOrgAi<T>(url: string, init?: RequestInit): Promise<T> {
  const jwt = await getAdminJwt();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json = (await res.json()) as { success?: boolean; error?: string; data?: T };
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data as T;
}

export function useAiPlatformSettings() {
  const { orgSlug, orgId } = useOrgScopeKey();
  return useQuery({
    queryKey: settingsKey(orgSlug, orgId),
    enabled: Boolean(orgSlug || orgId),
    queryFn: () =>
      fetchOrgAi<AiPlatformOrgSettingsDto>(
        scopedOrgFunctionsUrl('ai-platform-settings', orgSlug, orgId)
      ),
  });
}

export function useUpdateAiPlatformSettings() {
  const { orgSlug, orgId } = useOrgScopeKey();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      enabled?: boolean;
      dailyCallLimit?: number;
      monthlyCallLimit?: number;
    }) =>
      fetchOrgAi<AiPlatformOrgSettingsDto>(
        scopedOrgFunctionsUrl('ai-platform-settings', orgSlug, orgId),
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      ),
    onSuccess: (data) => {
      qc.setQueryData(settingsKey(orgSlug, orgId), data);
      qc.invalidateQueries({ queryKey: usageKey(orgSlug, orgId) });
    },
  });
}

export function useAiPlatformUsage() {
  const { orgSlug, orgId } = useOrgScopeKey();
  return useQuery({
    queryKey: usageKey(orgSlug, orgId),
    enabled: Boolean(orgSlug || orgId),
    queryFn: () =>
      fetchOrgAi<AiPlatformUsageSummaryDto>(
        scopedOrgFunctionsUrl('ai-platform-usage', orgSlug, orgId)
      ),
    staleTime: 30_000,
  });
}
