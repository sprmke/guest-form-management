import { isFeatureEnabled, type PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';
import { usePropertyEntitlements } from '@/features/dashboard/plans/hooks/usePropertyEntitlements';

export function useFeatureGate(feature: PlanFeatureKey, propertyIdOverride?: string | null) {
  const query = usePropertyEntitlements(propertyIdOverride);
  const entitlements = query.data;

  const allowed = entitlements ? isFeatureEnabled(entitlements, feature) : false;
  const canUse = !query.isLoading && Boolean(entitlements) && allowed;

  return {
    ...query,
    allowed,
    canUse,
    entitlements,
  };
}
