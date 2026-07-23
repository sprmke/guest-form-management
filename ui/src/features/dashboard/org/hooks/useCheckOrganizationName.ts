import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';

export function useCheckOrganizationName(
  name: string,
  excludeOrgId: string | undefined,
  enabled: boolean
) {
  const trimmed = name.trim();

  return useQuery({
    queryKey: ['check-organization-name', trimmed, excludeOrgId] as const,
    enabled: enabled && trimmed.length >= 2,
    staleTime: 30_000,
    queryFn: () => {
      const params = new URLSearchParams({ name: trimmed });
      if (excludeOrgId) {
        params.set('excludeOrgId', excludeOrgId);
      }
      return callEdgeFunction<{ available: boolean; message: string | null }>(
        `check-organization-name?${params.toString()}`
      );
    },
  });
}
