import { useMemo, useState } from 'react';

import { Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminEmptyState } from '@/features/dashboard/super-admin/components/shared/SuperAdminEmptyState';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import {
  SuperAdminPropertySubscriptionCard,
  SuperAdminPropertySubscriptionsEmptyState,
} from '@/features/dashboard/super-admin/components/super-admin-pricing/SuperAdminPropertySubscriptionCard';
import { SuperAdminPropertySubscriptionsSummaryCards } from '@/features/dashboard/super-admin/components/super-admin-pricing/SuperAdminPropertySubscriptionsSummaryCards';
import { SuperAdminPropertySubscriptionsTable } from '@/features/dashboard/super-admin/components/super-admin-pricing/SuperAdminPropertySubscriptionsTable';
import {
  SuperAdminPropertySubscriptionsResultsMeta,
  SuperAdminPropertySubscriptionsToolbar,
} from '@/features/dashboard/super-admin/components/super-admin-pricing/SuperAdminPropertySubscriptionsToolbar';
import { useRunPlatformBillingCron } from '@/features/dashboard/super-admin/hooks/usePlatformPaymentSettings';
import {
  useAssignPropertyPlan,
  usePricingPlans,
  usePropertySubscriptionsAdmin,
} from '@/features/dashboard/super-admin/hooks/usePricingPlans';
import {
  DEFAULT_SUPER_ADMIN_PROPERTY_SUBSCRIPTIONS_FILTERS,
  filterSuperAdminPropertySubscriptions,
  superAdminPropertySubscriptionsHasActiveFilters,
  type SuperAdminPropertySubscriptionsViewMode,
} from '@/features/dashboard/super-admin/lib/superAdminPricingFilters';


import { Button } from '@/components/ui/button';
import { useAdminMobileGridViewGuard } from '@/hooks/useAdminMobileGridViewGuard';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { usePageTitle } from '@/lib/pageTitle';

export function SuperAdminPropertySubscriptionsPage() {
  usePageTitle('Kame Homes - Property subscriptions');
  const [viewMode, setViewMode] = useState<SuperAdminPropertySubscriptionsViewMode>('table');
  const [filters, setFilters] = useState(DEFAULT_SUPER_ADMIN_PROPERTY_SUBSCRIPTIONS_FILTERS);
  const isMobileLayout = useIsBelowLg();
  useAdminMobileGridViewGuard(isMobileLayout, viewMode, setViewMode);

  const { data: plans = [] } = usePricingPlans();
  const { data: properties = [], isLoading, error } = usePropertySubscriptionsAdmin('', '', 500);
  const assignPlan = useAssignPropertyPlan();
  const billingCron = useRunPlatformBillingCron();

  const planOptions = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);
  const filteredProperties = useMemo(
    () => filterSuperAdminPropertySubscriptions(properties, filters),
    [properties, filters]
  );
  const hasActiveFilters = superAdminPropertySubscriptionsHasActiveFilters(filters);
  const showTableView = viewMode === 'table' && !isMobileLayout;

  return (
    <div className="space-y-3 sm:space-y-4">
      {isLoading ? (
        <SuperAdminPageLoading metricCount={4} />
      ) : error ? (
        <p className="text-destructive text-sm">Could not load property subscriptions.</p>
      ) : (
        <>
          <AdminPageHeader
            title="Property subscriptions"
            subtitle="Assign plans to properties across the platform."
            actions={
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                disabled={billingCron.isPending}
                onClick={() => billingCron.mutate()}
              >
                Run billing cron
              </Button>
            }
          />

          <SuperAdminPropertySubscriptionsSummaryCards properties={properties} />

          <SuperAdminPropertySubscriptionsToolbar
            filters={filters}
            viewMode={viewMode}
            plans={planOptions}
            hideTableView={isMobileLayout}
            onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
            onPlanCodeChange={(planCode) => setFilters((current) => ({ ...current, planCode }))}
            onViewModeChange={setViewMode}
          />

          {filteredProperties.length > 0 ? (
            showTableView ? (
              <SuperAdminPropertySubscriptionsTable
                properties={filteredProperties}
                plans={planOptions}
                onAssign={async (propertyId, planId) => {
                  try {
                    await assignPlan.mutateAsync({
                      propertyId,
                      planId,
                      note: 'Super-admin manual assign',
                    });
                    toast.success('Plan assigned');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Assign failed');
                  }
                }}
                isAssigning={assignPlan.isPending}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {filteredProperties.map((row) => (
                  <SuperAdminPropertySubscriptionCard
                    key={row.propertyId}
                    row={row}
                    plans={planOptions}
                    onAssign={async (propertyId, planId) => {
                      try {
                        await assignPlan.mutateAsync({
                          propertyId,
                          planId,
                          note: 'Super-admin manual assign',
                        });
                        toast.success('Plan assigned');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Assign failed');
                      }
                    }}
                    isAssigning={assignPlan.isPending}
                  />
                ))}
              </div>
            )
          ) : properties.length === 0 ? (
            <SuperAdminEmptyState icon={Building2} title="No properties yet" />
          ) : (
            <SuperAdminPropertySubscriptionsEmptyState filtered={hasActiveFilters} />
          )}

          <SuperAdminPropertySubscriptionsResultsMeta
            visibleCount={filteredProperties.length}
            totalCount={properties.length}
          />
        </>
      )}
    </div>
  );
}
