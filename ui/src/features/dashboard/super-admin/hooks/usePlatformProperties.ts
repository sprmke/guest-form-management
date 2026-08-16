import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import type { PlatformProperty } from '@/features/dashboard/super-admin/types/platformProperty';

export const PLATFORM_PROPERTIES_QUERY_KEY = ['super-admin', 'platform-properties'] as const;

export function usePlatformProperties() {
  return useQuery({
    queryKey: PLATFORM_PROPERTIES_QUERY_KEY,
    queryFn: () =>
      callEdgeFunction<{ properties: PlatformProperty[] }>('list-platform-properties').then(
        (data) => data.properties
      ),
  });
}
