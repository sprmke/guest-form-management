import { useMemo } from 'react';

import { useQueries, useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import type { Organization, Property } from '@/features/dashboard/org/types';

export const ORGANIZATIONS_QUERY_KEY = ['organizations'] as const;

export function useOrganizations() {
  return useQuery({
    queryKey: ORGANIZATIONS_QUERY_KEY,
    queryFn: () => callEdgeFunction<{ organizations: Organization[] }>('list-organizations'),
  });
}

export function useProperties(orgSlug: string | undefined) {
  return useQuery({
    queryKey: ['properties', orgSlug] as const,
    enabled: Boolean(orgSlug),
    queryFn: () =>
      callEdgeFunction<{ properties: Property[] }>(
        `list-properties?orgSlug=${encodeURIComponent(orgSlug!)}`
      ),
  });
}

/** Properties for every org — used by the sidebar context switcher. */
export function useAllOrgProperties(organizations: Organization[]) {
  const queries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ['properties', org.slug] as const,
      queryFn: () =>
        callEdgeFunction<{ properties: Property[] }>(
          `list-properties?orgSlug=${encodeURIComponent(org.slug)}`
        ),
    })),
  });

  const byOrgSlug = useMemo(() => {
    const map = new Map<string, Property[]>();
    organizations.forEach((org, index) => {
      map.set(org.slug, queries[index]?.data?.properties ?? []);
    });
    return map;
  }, [organizations, queries]);

  const isLoading = organizations.length > 0 && queries.some((query) => query.isLoading);

  return { byOrgSlug, isLoading };
}
