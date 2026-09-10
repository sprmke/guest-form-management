import { useEffect, type ReactNode } from 'react';

import { Link, useParams } from 'react-router-dom';

import { PlanGatedText } from '@/features/dashboard/plans/components/PlanUpgradeLink';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';
import { featureGateCopy } from '@/features/dashboard/plans/lib/featureGateCopy';
import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';
import { orgSectionPath } from '@/features/dashboard/team/lib/orgPermissions';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { RouteGuardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';

type Props = {
  feature: PlanFeatureKey;
  children: ReactNode;
};

/**
 * Org-level analog of `RequirePropertyFeature` — this repo's first org-scoped paid feature
 * (existing org pages like dashboard/bookings/properties are baseline-free). Same shape:
 * skeleton while loading, upgrade panel when blocked, children when allowed.
 */
export function RequireOrgFeature({ feature, children }: Props) {
  const { allowed, isLoading } = useFeatureGate(feature);
  const { open } = useUpgradeModal();
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  const copy = featureGateCopy(feature);
  const plansPath = orgSectionPath(orgSlug, 'plans');

  useEffect(() => {
    if (!isLoading && !allowed) {
      open(feature);
    }
  }, [allowed, feature, isLoading, open]);

  if (isLoading) {
    return <RouteGuardSkeleton />;
  }

  if (!allowed) {
    return (
      <FloatingPanel padding="lg" className="py-16 text-center">
        <p className="text-foreground text-sm font-semibold">{copy.title}</p>
        <p className="text-caption mx-auto mt-1 max-w-sm">
          <PlanGatedText text={copy.description} feature={feature} />
        </p>
        <Button asChild className="mt-4 min-h-[44px]">
          <Link to={plansPath}>{copy.ctaLabel}</Link>
        </Button>
      </FloatingPanel>
    );
  }

  return <>{children}</>;
}
