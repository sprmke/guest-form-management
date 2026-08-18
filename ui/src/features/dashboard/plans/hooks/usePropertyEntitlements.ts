import { useQuery } from '@tanstack/react-query';

import { fetchPropertyEntitlements } from '@/features/dashboard/plans/lib/entitlementsApi';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

const entitlementsKey = (propertyId: string | null) =>
  ['property', propertyId, 'entitlements'] as const;

export function usePropertyEntitlements(propertyIdOverride?: string | null) {
  const routePropertyId = usePropertyIdParam();
  const propertyId = propertyIdOverride ?? routePropertyId;

  return useQuery({
    queryKey: entitlementsKey(propertyId),
    queryFn: () => fetchPropertyEntitlements(propertyId!),
    enabled: Boolean(propertyId),
    staleTime: 60_000,
    retry: false,
  });
}
