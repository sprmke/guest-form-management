import {
  useParkingIdParam,
  usePropertyIdParam,
  useResolvedOrgId,
} from '@/features/dashboard/org/lib/adminApiScope';
import { useOrgPlan } from '@/features/dashboard/plans/hooks/useOrgPlan';
import { usePropertyEntitlements } from '@/features/dashboard/plans/hooks/usePropertyEntitlements';
import { deriveOrgEntitlementsFromPlan } from '@/features/dashboard/plans/lib/orgEntitlements';
import { isFeatureEnabled, type PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';

/** Safety-net fallback for parking when the org has no live portfolio bundle — org-level plans
 * shipped in Phase 8 and narrow this for orgs that do have a bundle (see
 * getActiveOrgSubscriptionForProperty / firstActivePropertyIdForOrg), but a parking-only org still
 * has no property-scoped entitlement to check for these two features. See
 * docs/architecture/plans-feature-matrix.md. */
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
  const orgId = useResolvedOrgId();
  const propertyQuery = usePropertyEntitlements(propertyIdOverride);
  const orgPlanQuery = useOrgPlan(propertyId ? null : orgId);

  const entitlements = propertyId
    ? propertyQuery.data
    : deriveOrgEntitlementsFromPlan(orgPlanQuery.data);

  const isLoading = propertyId ? propertyQuery.isLoading : orgPlanQuery.isLoading;

  const parkingInterimAllowed = isParkingInterimUngated(feature, parkingId, propertyId);
  const allowed =
    parkingInterimAllowed || (entitlements ? isFeatureEnabled(entitlements, feature) : false);
  const canUse = !isLoading && allowed && (parkingInterimAllowed || Boolean(entitlements));

  return {
    ...(propertyId ? propertyQuery : orgPlanQuery),
    allowed,
    canUse,
    entitlements,
  };
}
