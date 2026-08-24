import { useMemo } from 'react';

import { PlanReviewDialog } from '@/features/dashboard/plans/components/PlanReviewDialog';
import {
  useAssignPropertyFreePlan,
  useCreatePropertyPlanCheckout,
  usePropertyPlan,
} from '@/features/dashboard/plans/hooks/usePropertyPlan';
import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';
import { resolveMinimumPlanForFeature } from '@/features/dashboard/plans/lib/planPresentation';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: PlanFeatureKey;
};

/**
 * Feature-gate entry point into the upgrade flow — resolves the *specific* minimum plan that
 * unlocks `feature` for this property, then reuses `PlanReviewDialog` (the same reviewed,
 * recognized purchase experience as the Plans page) pre-selected to that plan, right where the
 * host already is. No intermediate "here's a generic message, go to the Plans page" step.
 */
export function SubscriptionUpgradeModal({ open, onOpenChange, feature }: Props) {
  const { data } = usePropertyPlan();
  const assignFree = useAssignPropertyFreePlan();
  const createCheckout = useCreatePropertyPlanCheckout();

  const plans = useMemo(() => data?.plans ?? [], [data?.plans]);
  const currentPlanId = data?.subscription?.planId;
  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentPlanId) ?? null,
    [plans, currentPlanId]
  );
  const targetPlan = useMemo(() => resolveMinimumPlanForFeature(plans, feature), [plans, feature]);

  return (
    <PlanReviewDialog
      open={open && Boolean(targetPlan)}
      plan={targetPlan}
      currentPlan={currentPlan}
      subscription={data?.subscription ?? null}
      onOpenChange={onOpenChange}
      onConfirmFree={async (planId) => {
        await assignFree.mutateAsync(planId);
      }}
      onCheckoutPaid={async (planId) => {
        const { checkoutUrl } = await createCheckout.mutateAsync(planId);
        window.location.assign(checkoutUrl);
      }}
      isSubmitting={assignFree.isPending || createCheckout.isPending}
    />
  );
}
