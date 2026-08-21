import { useEffect, type ReactNode } from 'react';

import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';
import { featureGateCopy } from '@/features/dashboard/plans/lib/featureGateCopy';
import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { Button } from '@/components/ui/button';

type Props = {
  feature: PlanFeatureKey;
  children: ReactNode;
};

/** Route-level plan gate — blocked hosts see an upgrade prompt, not the gated surface. */
export function RequirePropertyFeature({ feature, children }: Props) {
  const { allowed, isLoading } = useFeatureGate(feature);
  const { open } = useUpgradeModal();
  const { orgSlug, propertySlug } = useOrgContext();
  const copy = featureGateCopy(feature);

  useEffect(() => {
    if (!isLoading && !allowed) {
      open(feature);
    }
  }, [allowed, feature, isLoading, open]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!allowed) {
    return (
      <FloatingPanel padding="lg" className="py-16 text-center">
        <p className="text-foreground text-sm font-semibold">{copy.title}</p>
        <p className="text-caption mx-auto mt-1 max-w-sm">{copy.description}</p>
        <Button asChild className="mt-4 min-h-[44px]">
          <Link to={propertySectionPath(orgSlug, propertySlug, 'plans')}>{copy.ctaLabel}</Link>
        </Button>
      </FloatingPanel>
    );
  }

  return <>{children}</>;
}
