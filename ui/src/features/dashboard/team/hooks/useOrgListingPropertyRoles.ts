import { useMemo } from 'react';

import { useQueries } from '@tanstack/react-query';

import { teamGet } from '@/features/dashboard/team/lib/teamApi';
import type { CustomPropertyRole } from '@/features/dashboard/team/types/propertyTeam';

const LISTING_PROPERTY_ROLES_QUERY_KEY = ['listing-property-custom-roles'] as const;

async function loadPropertyCustomRoles(propertyId: string): Promise<CustomPropertyRole[]> {
  const payload = await teamGet<{ customRoles: CustomPropertyRole[] }>(
    '/property-team-custom-roles',
    propertyId
  );
  return payload.customRoles ?? [];
}

/** Loads seeded/custom property role templates for org listing assignment pickers. */
export function useOrgListingPropertyRoles(propertyIds: string[]) {
  const stableIds = useMemo(() => [...new Set(propertyIds.filter(Boolean))].sort(), [propertyIds]);

  const queries = useQueries({
    queries: stableIds.map((propertyId) => ({
      queryKey: [...LISTING_PROPERTY_ROLES_QUERY_KEY, propertyId],
      queryFn: () => loadPropertyCustomRoles(propertyId),
      staleTime: 60_000,
    })),
  });

  const rolesByPropertyId = useMemo(() => {
    const map = new Map<string, CustomPropertyRole[]>();
    stableIds.forEach((propertyId, index) => {
      map.set(propertyId, queries[index]?.data ?? []);
    });
    return map;
  }, [stableIds, queries]);

  const isLoading = queries.some((query) => query.isLoading);

  return { rolesByPropertyId, isLoading };
}
