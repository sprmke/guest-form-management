import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import { DEFAULT_RESIDENCE_NAME } from '@/features/dashboard/org/lib/propertyDisplay';
import {
  isPropertyTowerForResidence,
  isValidUnitNumber,
} from '@/features/dashboard/org/lib/propertyTowerUnit';
import type { PropertyTowerUnitConflict } from '@/features/dashboard/org/lib/propertyTowerUnitConflict';
import type { Property } from '@/features/dashboard/org/types';

type CheckTowerUnitResponse = {
  available: boolean;
  message: string | null;
  conflict: {
    propertyId: string;
    propertyName: string;
    orgName: string | null;
  } | null;
};

export function useTowerUnitConflict(
  tower: string,
  unitNumber: string,
  excludePropertyId?: string
): {
  conflict: PropertyTowerUnitConflict | null;
  hasDuplicate: boolean;
  isChecking: boolean;
} {
  const ready =
    isPropertyTowerForResidence(tower, DEFAULT_RESIDENCE_NAME) && isValidUnitNumber(unitNumber);

  const query = useQuery({
    queryKey: ['check-tower-unit', tower, unitNumber, excludePropertyId] as const,
    enabled: ready,
    staleTime: 30_000,
    queryFn: () => {
      const params = new URLSearchParams({
        tower,
        unitNumber,
      });
      if (excludePropertyId) {
        params.set('excludePropertyId', excludePropertyId);
      }
      return callEdgeFunction<CheckTowerUnitResponse>(`check-tower-unit?${params.toString()}`);
    },
  });

  const conflict = useMemo((): PropertyTowerUnitConflict | null => {
    const row = query.data?.conflict;
    if (!row || query.data?.available !== false) return null;

    const property = {
      id: row.propertyId,
      name: row.propertyName,
    } as Property;

    return {
      property,
      orgName: row.orgName ?? '',
      orgSlug: '',
    };
  }, [query.data]);

  return {
    conflict,
    hasDuplicate: conflict !== null,
    isChecking: ready && query.isFetching,
  };
}
