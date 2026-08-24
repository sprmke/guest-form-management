import type { ReactNode } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { usePropertyPlan } from '@/features/dashboard/plans/hooks/usePropertyPlan';
import type { PropertySection } from '@/features/dashboard/team/lib/propertyPermissions';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { RouteGuardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';

const ALLOWED_WHEN_SUSPENDED: PropertySection[] = ['plans', 'help-support'];

type Props = {
  section: PropertySection;
  children: ReactNode;
};

export function RequirePropertySubscriptionAccess({ section, children }: Props) {
  const { orgSlug, propertySlug } = useOrgContext();
  const location = useLocation();
  const { data, isLoading } = usePropertyPlan();

  if (isLoading && !data) {
    return <RouteGuardSkeleton />;
  }

  const status = data?.subscription?.status;
  const isSuspended = status === 'suspended';
  const isPastDue = status === 'past_due';

  if (isSuspended && !ALLOWED_WHEN_SUSPENDED.includes(section)) {
    const plansPath = propertySectionPath(orgSlug, propertySlug, 'plans');
    if (location.pathname !== plansPath) {
      return <Navigate to={plansPath} replace />;
    }
  }

  if (isSuspended && section !== 'plans') {
    return (
      <FloatingPanel padding="lg" className="py-16 text-center">
        <p className="text-foreground text-sm font-semibold">Subscription suspended</p>
        <p className="text-caption mx-auto mt-1 max-w-sm">
          Pay your plan to restore dashboard access for this listing.
        </p>
        <Button asChild className="mt-4 min-h-[44px]">
          <a href={propertySectionPath(orgSlug, propertySlug, 'plans')}>Go to Plans & Billing</a>
        </Button>
      </FloatingPanel>
    );
  }

  return (
    <>
      {isPastDue && section !== 'plans' ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-3 rounded-xl border px-3 py-2 text-sm">
          Subscription past due — pay from Plans & Billing before access is restricted.
        </div>
      ) : null}
      {children}
    </>
  );
}
