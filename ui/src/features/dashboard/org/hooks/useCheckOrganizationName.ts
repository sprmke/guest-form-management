import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const NAME_CHECK_DEBOUNCE_MS = 400;

export function useCheckOrganizationName(
  name: string,
  excludeOrgId: string | undefined,
  enabled: boolean
) {
  const trimmed = name.trim();
  const debouncedName = useDebouncedValue(trimmed, NAME_CHECK_DEBOUNCE_MS);
  const isDebouncing = trimmed !== debouncedName;
  const canCheck = enabled && debouncedName.length >= 2 && !isDebouncing;

  const query = useQuery({
    queryKey: ['check-organization-name', debouncedName, excludeOrgId] as const,
    enabled: canCheck,
    staleTime: 30_000,
    queryFn: () => {
      const params = new URLSearchParams({ name: debouncedName });
      if (excludeOrgId) {
        params.set('excludeOrgId', excludeOrgId);
      }
      return callEdgeFunction<{ available: boolean; message: string | null }>(
        `check-organization-name?${params.toString()}`
      );
    },
  });

  const nameReady = enabled && trimmed.length >= 2;

  return {
    ...query,
    isChecking: Boolean(nameReady && (isDebouncing || query.isFetching)),
    showChecking: Boolean(nameReady && !isDebouncing && query.isFetching),
    isUnavailable: Boolean(
      nameReady && !isDebouncing && query.isFetched && query.data?.available === false
    ),
  };
}
