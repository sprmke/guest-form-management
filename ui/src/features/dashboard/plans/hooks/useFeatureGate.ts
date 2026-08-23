import { useParkingIdParam, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { usePropertyEntitlements } from '@/features/dashboard/plans/hooks/usePropertyEntitlements';
import { isFeatureEnabled, type PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';

/** Until org-level plans ship — see docs/workflow/planned/pricing-portfolio-bundling.md */
const PARKING_INTERIM_UNGATED_FEATURES = new Set<PlanFeatureKey>([
  'telegramNotifications',
  'aiDashboardAssistant',
]);

function isParkingInterimUngated(
  feature: PlanFeatureKey,
  parkingId: string | null,
  propertyId: string | null
): boolean {
  return Boolean(parkingId && !propertyId && PARKING_INTERIM_UNGATED_FEATURES.has(feature));
}

export function useFeatureGate(feature: PlanFeatureKey, propertyIdOverride?: string | null) {
  const parkingId = useParkingIdParam();
  const routePropertyId = usePropertyIdParam();
  const propertyId = propertyIdOverride ?? routePropertyId;
  const query = usePropertyEntitlements(propertyIdOverride);
  const entitlements = query.data;

  const parkingInterimAllowed = isParkingInterimUngated(feature, parkingId, propertyId);
  const allowed =
    parkingInterimAllowed || (entitlements ? isFeatureEnabled(entitlements, feature) : false);
  const canUse = !query.isLoading && allowed && (parkingInterimAllowed || Boolean(entitlements));

  return {
    ...query,
    allowed,
    canUse,
    entitlements,
  };
}
