import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { publicListingFetch } from '@/features/guest/marketing/shared/lib/publicListingFetch';
import {
  EMPTY_PROPERTIES_FACETS,
  writePropertiesQuery,
  type PropertiesFacets,
  type PropertiesListingQuery,
  type PublicPropertyListItem,
} from '@/features/guest/marketing/properties/lib/propertiesQuery';

export const PUBLIC_PROPERTIES_QUERY_KEY = ['list-public-properties'] as const;

export type PublicPropertiesResult = {
  data: PublicPropertyListItem[];
  total: number;
  facets: PropertiesFacets;
  page: number;
  pageSize: number;
};

async function fetchPublicProperties(
  query: PropertiesListingQuery
): Promise<PublicPropertiesResult> {
  const params = writePropertiesQuery(query);
  const result = await publicListingFetch<PublicPropertyListItem, PropertiesFacets>(
    'list-public-properties',
    params
  );
  return {
    data: result.data,
    total: result.total,
    facets: {
      types: result.facets.types ?? EMPTY_PROPERTIES_FACETS.types,
      price: result.facets.price ?? EMPTY_PROPERTIES_FACETS.price,
      bedrooms: result.facets.bedrooms ?? EMPTY_PROPERTIES_FACETS.bedrooms,
      amenities: result.facets.amenities ?? EMPTY_PROPERTIES_FACETS.amenities,
      developments: result.facets.developments ?? EMPTY_PROPERTIES_FACETS.developments,
    },
    page: result.page,
    pageSize: result.pageSize,
  };
}

export function usePublicProperties(query: PropertiesListingQuery, enabled = true) {
  return useQuery({
    queryKey: [...PUBLIC_PROPERTIES_QUERY_KEY, query],
    queryFn: () => fetchPublicProperties(query),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
    enabled,
  });
}
