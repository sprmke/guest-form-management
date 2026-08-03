import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import { getReservedDisplayNameViolation } from '@/lib/validation/reservedDisplayNames';

export function useCheckPropertyName(
  name: string,
  excludePropertyId: string | undefined,
  enabled: boolean
) {
  const trimmed = name.trim();

  return useQuery({
    queryKey: ['check-property-name', trimmed, excludePropertyId] as const,
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
      if (excludePropertyId) {
        params.set('excludePropertyId', excludePropertyId);
      }
      return callEdgeFunction<{ available: boolean; message: string | null }>(
        `check-property-name?${params.toString()}`
      );
    },
  });
}
