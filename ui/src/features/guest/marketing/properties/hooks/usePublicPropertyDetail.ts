import { useQuery } from '@tanstack/react-query';

import { getPropertyDetail } from '@/features/guest/marketing/properties/data/mockPropertyDetail';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';
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

export function usePublicPropertyDetail(propertySlug: string) {
  const mockPlaceholder = resolveMockProperty(propertySlug);

  return useQuery({
    queryKey: [...PUBLIC_PROPERTY_QUERY_KEY, propertySlug],
    queryFn: () => fetchPublicProperty(propertySlug),
    enabled: Boolean(propertySlug),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    placeholderData: mockPlaceholder ?? undefined,
  });
}
