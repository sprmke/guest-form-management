import type { ReactNode } from 'react';

import { useResolvedOrgId } from '@/features/dashboard/org/lib/adminApiScope';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';
import { useOrgPlan } from '@/features/dashboard/plans/hooks/useOrgPlan';
import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';
import {
  planDisplayName,
  resolveMinimumPlanForFeature,
} from '@/features/dashboard/plans/lib/planPresentation';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type TierBadgeProps = {
  feature: PlanFeatureKey;
  className?: string;
  /**
   * `inline` — sits next to a title/label.
   * `corner` — absolute top-right on a `relative` parent (use with `TierBadgeAnchor` on buttons).
   */
  placement?: 'inline' | 'corner';
};

/**
 * Solid plan pill naming the minimum plan that unlocks `feature` — only renders when the current
 * property is below that tier. Prefer section/card titles; on buttons use `TierBadgeAnchor` so the
 * pill sits on the top-right corner, not inside the button label.
 */
export function TierBadge({ feature, className, placement = 'inline' }: TierBadgeProps) {
  const { allowed, isLoading: gateLoading } = useFeatureGate(feature);
  const orgId = useResolvedOrgId();
  const { data, isLoading: plansLoading } = useOrgPlan(orgId);

  if (gateLoading || plansLoading || allowed || !data) return null;

  const requiredPlan = resolveMinimumPlanForFeature(data.plans, feature);
  if (!requiredPlan) return null;

  const planName = planDisplayName(requiredPlan);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-tier-badge
          className={cn(
            'bg-primary text-primary-foreground inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide',
            placement === 'corner' && 'absolute -right-1.5 -top-1.5 z-10',
            className
          )}
        >
          {planName}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">Available on the {planName} plan and above</TooltipContent>
    </Tooltip>
  );
}

type TierBadgeAnchorProps = {
  feature: PlanFeatureKey;
  children: ReactNode;
  className?: string;
  badgeClassName?: string;
};

/** Wraps a button (or control) so the plan pill anchors to the top-right corner. */
export function TierBadgeAnchor({
  feature,
  children,
  className,
  badgeClassName,
}: TierBadgeAnchorProps) {
  return (
    <span className={cn('relative inline-flex', className)}>
      {children}
      <TierBadge feature={feature} placement="corner" className={badgeClassName} />
    </span>
  );
}
