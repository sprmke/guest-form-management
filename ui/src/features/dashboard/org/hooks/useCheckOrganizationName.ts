import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import { getReservedDisplayNameViolation } from '@/lib/validation/reservedDisplayNames';

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
      const reservedMessage = getReservedDisplayNameViolation(trimmed);
      if (reservedMessage) {
        return Promise.resolve({
          available: false,
          message: reservedMessage,
          reason: 'reserved' as const,
        });
      }

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
