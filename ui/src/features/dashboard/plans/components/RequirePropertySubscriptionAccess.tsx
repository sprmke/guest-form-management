import type { ReactNode } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { orgPlansPath } from '@/features/dashboard/org/lib/tenantPaths';
import { usePropertyEntitlements } from '@/features/dashboard/plans/hooks/usePropertyEntitlements';
import type { PropertySection } from '@/features/dashboard/team/lib/propertyPermissions';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { RouteGuardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';

/** Billing is org-level — suspension locks every property in the org, not just one, so there's
 * no per-property "plans" section to exempt anymore; only Help & Support stays reachable. */
const ALLOWED_WHEN_SUSPENDED: PropertySection[] = ['help-support'];

type Props = {
  section: PropertySection;
  children: ReactNode;
};

export function RequirePropertySubscriptionAccess({ section, children }: Props) {
  const { orgSlug } = useOrgContext();
  const location = useLocation();
  const { data, isLoading } = usePropertyEntitlements();

  if (isLoading && !data) {
    return <RouteGuardSkeleton />;
  }

  const status = data?.status;
  const isSuspended = status === 'suspended';
  const isPastDue = status === 'past_due';
  const plansPath = orgPlansPath(orgSlug);

  if (isSuspended && !ALLOWED_WHEN_SUSPENDED.includes(section)) {
    if (location.pathname !== plansPath) {
      return <Navigate to={plansPath} replace />;
    }
  }

  if (isSuspended) {
    return (
      <FloatingPanel padding="lg" className="py-16 text-center">
        <p className="text-foreground text-sm font-semibold">Subscription suspended</p>
        <p className="text-caption mx-auto mt-1 max-w-sm">
          Pay your organization’s plan to restore dashboard access.
        </p>
        <Button asChild className="mt-4 min-h-[44px]">
          <a href={plansPath}>Go to Plans & Billing</a>
        </Button>
      </FloatingPanel>
    );
  }

  return (
    <>
      {isPastDue ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-3 rounded-xl border px-3 py-2 text-sm">
          Subscription past due — pay from Plans & Billing before access is restricted.
        </div>
      ) : null}
      {children}
    </>
  );
}
