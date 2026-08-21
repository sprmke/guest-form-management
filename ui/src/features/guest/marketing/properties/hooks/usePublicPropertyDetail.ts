import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { usePreviewOverride } from '@/features/guest/lib/previewOverrideContext';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';
import { getPropertyDetail } from '@/features/guest/marketing/properties/data/mockPropertyDetail';
import {
  mapApiPropertyToResolved,
  mapBasicMockToResolved,
  mapMockPropertyToResolved,
} from '@/features/guest/marketing/properties/lib/mapPublicPropertyDetail';
import type {
  PublicPropertyDetailDto,
  ResolvedPropertyDetail,
} from '@/features/guest/marketing/properties/types/publicProperty';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const PUBLIC_PROPERTY_QUERY_KEY = ['public-property'] as const;

function publicPropertyUrl(slug: string): string {
  return `${FUNCTIONS_URL}/get-public-property?property=${encodeURIComponent(slug)}`;
}

function resolveMockProperty(slug: string): ResolvedPropertyDetail | null {
  const detail = getPropertyDetail(slug);
  if (detail) return mapMockPropertyToResolved(detail);

  const basic = mockProperties.find((entry) => entry.slug === slug || entry.id === slug);
  if (basic) return mapBasicMockToResolved(basic);

  return null;
}

async function fetchPublicProperty(slug: string): Promise<ResolvedPropertyDetail | null> {
  const res = await fetch(publicPropertyUrl(slug), {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });

  if (res.status === 404) {
    return resolveMockProperty(slug);
  }

  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: PublicPropertyDetailDto;
  };

  if (!json.success || !json.data) {
    throw new Error(json.error ?? 'Failed to load property');
  }

  return mapApiPropertyToResolved(json.data);
}

function propertyLandingOverrideResult(
  data: ResolvedPropertyDetail
): UseQueryResult<ResolvedPropertyDetail | null, Error> {
  return {
    data,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: true,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isRefetching: false,
    isStale: false,
    isPlaceholderData: false,
    isPaused: false,
    status: 'success',
    fetchStatus: 'idle',
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    refetch: async () =>
      ({
        data,
        error: null,
        isError: false,
        isLoading: false,
        isSuccess: true,
        status: 'success',
      }) as UseQueryResult<ResolvedPropertyDetail | null, Error>,
  } as UseQueryResult<ResolvedPropertyDetail | null, Error>;
}

export function usePublicPropertyDetail(propertySlug: string) {
  const override = usePreviewOverride();
  const hasOverride = override?.kind === 'property-landing';
  const mockPlaceholder = resolveMockProperty(propertySlug);

  const query = useQuery({
    queryKey: [...PUBLIC_PROPERTY_QUERY_KEY, propertySlug],
    queryFn: () => fetchPublicProperty(propertySlug),
    enabled: !hasOverride && Boolean(propertySlug),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    placeholderData: mockPlaceholder ?? undefined,
  });

  if (hasOverride) {
    return propertyLandingOverrideResult(override.data);
  }
  return query;
}
