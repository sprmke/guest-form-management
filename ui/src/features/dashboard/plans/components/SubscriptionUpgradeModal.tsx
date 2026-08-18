import { Link } from 'react-router-dom';

import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';
import { featureGateCopy } from '@/features/dashboard/plans/lib/featureGateCopy';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';

import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: PlanFeatureKey;
};

export function SubscriptionUpgradeModal({ open, onOpenChange, feature }: Props) {
  const orgContext = useOptionalOrgContext();
  const copy = featureGateCopy(feature);

  const plansPath =
    orgContext?.org.slug && orgContext.property.slug
      ? propertySectionPath(orgContext.org.slug, orgContext.property.slug, 'plans')
      : null;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),24rem)]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{copy.title}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <p className="text-muted-foreground text-sm">{copy.description}</p>
        <ResponsiveModalFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          {plansPath ? (
            <Button type="button" asChild onClick={() => onOpenChange(false)}>
              <Link to={plansPath}>{copy.ctaLabel}</Link>
            </Button>
          ) : (
            <Button type="button" disabled>
              {copy.ctaLabel}
            </Button>
          )}
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
