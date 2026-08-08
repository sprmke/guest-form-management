import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { publicListingFetch } from '@/features/guest/marketing/shared/lib/publicListingFetch';
import {
  EMPTY_DEVELOPMENTS_FACETS,
  writeDevelopmentsQuery,
  type DevelopmentsFacets,
  type DevelopmentsListingQuery,
  type PublicDevelopmentListItem,
} from '@/features/guest/marketing/developments/lib/developmentsQuery';

export const PUBLIC_DEVELOPMENTS_QUERY_KEY = ['list-public-developments'] as const;

export type PublicDevelopmentsResult = {
  data: PublicDevelopmentListItem[];
  total: number;
  facets: DevelopmentsFacets;
  page: number;
  pageSize: number;
};

async function fetchPublicDevelopments(
  query: DevelopmentsListingQuery
): Promise<PublicDevelopmentsResult> {
  const params = writeDevelopmentsQuery(query);
  const result = await publicListingFetch<PublicDevelopmentListItem, DevelopmentsFacets>(
    'list-public-developments',
    params
  );
  return {
    data: result.data,
    total: result.total,
    facets: {
      types: result.facets.types ?? EMPTY_DEVELOPMENTS_FACETS.types,
      cities: result.facets.cities ?? EMPTY_DEVELOPMENTS_FACETS.cities,
      price: result.facets.price ?? EMPTY_DEVELOPMENTS_FACETS.price,
      developers: result.facets.developers ?? EMPTY_DEVELOPMENTS_FACETS.developers,
    },
    page: result.page,
    pageSize: result.pageSize,
  };
}

export function usePublicDevelopments(query: DevelopmentsListingQuery, enabled = true) {
  return useQuery({
    queryKey: [...PUBLIC_DEVELOPMENTS_QUERY_KEY, query],
    queryFn: () => fetchPublicDevelopments(query),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
    enabled,
  });
}
