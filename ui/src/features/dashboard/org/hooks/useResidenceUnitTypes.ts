import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import {
  defaultUnitTypesForResidence,
  type DevelopmentUnitType,
} from '@/features/dashboard/bookings/lib/unitTypes';

export function residenceUnitTypesQueryKey(residenceName: string) {
  return ['residence-unit-types', residenceName.trim()] as const;
}

export function useResidenceUnitTypes(residenceName: string) {
  const normalized = residenceName.trim();

  return useQuery({
    queryKey: residenceUnitTypesQueryKey(normalized),
    enabled: Boolean(normalized),
    queryFn: async (): Promise<DevelopmentUnitType[]> => {
      try {
        const data = await callEdgeFunction<{ unitTypes: DevelopmentUnitType[] }>(
          `get-residence-unit-types?residenceName=${encodeURIComponent(normalized)}`
        );
        return data.unitTypes;
      } catch {
        return defaultUnitTypesForResidence(normalized);
      }
    },
    placeholderData: () => defaultUnitTypesForResidence(normalized),
  });
}
