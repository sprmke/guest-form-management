import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';

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
