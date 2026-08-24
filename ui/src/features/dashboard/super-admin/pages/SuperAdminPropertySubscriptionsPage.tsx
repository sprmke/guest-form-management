import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { AdminListPagination } from '@/features/dashboard/bookings/components/AdminListToolbar';
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
  usePropertySubscriptionsSummary,
} from '@/features/dashboard/super-admin/hooks/usePricingPlans';
import {
  DEFAULT_SUPER_ADMIN_PROPERTY_SUBSCRIPTIONS_FILTERS,
  superAdminPropertySubscriptionsHasActiveFilters,
  type SuperAdminPropertySubscriptionsViewMode,
} from '@/features/dashboard/super-admin/lib/superAdminPricingFilters';

import { Button } from '@/components/ui/button';
import { useAdminMobileGridViewGuard } from '@/hooks/useAdminMobileGridViewGuard';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { usePageTitle } from '@/lib/pageTitle';
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  buildPageItems,
  normalizeAdminPageLimit,
} from '@/lib/table/pagination';

export function SuperAdminPropertySubscriptionsPage() {
  usePageTitle('Kame Homes - Property subscriptions');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const limit = normalizeAdminPageLimit(
    Number(searchParams.get('limit') ?? String(ADMIN_DEFAULT_PAGE_SIZE))
  );
  const [viewMode, setViewMode] = useState<SuperAdminPropertySubscriptionsViewMode>('table');
  const [filters, setFilters] = useState(DEFAULT_SUPER_ADMIN_PROPERTY_SUBSCRIPTIONS_FILTERS);
  const isMobileLayout = useIsBelowLg();
  useAdminMobileGridViewGuard(isMobileLayout, viewMode, setViewMode);

  // Full (unpaginated first page) plan catalog — used only to populate the
  // assign-plan dropdown, not for the properties list itself.
  const { rows: plans } = usePricingPlans();
  const {
    rows: properties,
    total,
    isLoading,
    isFetching,
    error,
  } = usePropertySubscriptionsAdmin(
    filters.search,
    filters.planCode,
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit
  );
  // Platform-wide aggregate counts (not just the current filtered/paginated
  // page) feeding the summary cards — computed server-side via count-only
  // queries so it stays cheap at thousands of properties.
  const { summary } = usePropertySubscriptionsSummary();
  const assignPlan = useAssignPropertyPlan();
  const billingCron = useRunPlatformBillingCron();

  const planOptions = useMemo(
    () => plans.filter((plan) => plan.isActive && plan.code !== 'business_plus'),
    [plans]
  );
  // Filtering (search/planCode) is already applied server-side by the edge
  // function — `properties` is the current page of already-filtered rows.
  const filteredProperties = properties;
  const hasActiveFilters = superAdminPropertySubscriptionsHasActiveFilters(filters);
  const showTableView = viewMode === 'table' && !isMobileLayout;

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const pageItems = useMemo(() => buildPageItems(page, pageCount), [page, pageCount]);

  const setPage = (nextPage: number) => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (nextPage === 1) sp.delete('page');
        else sp.set('page', String(nextPage));
        return sp;
      },
      { replace: true }
    );
  };

  const setLimit = (nextLimit: number) => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (nextLimit === ADMIN_DEFAULT_PAGE_SIZE) sp.delete('limit');
        else sp.set('limit', String(nextLimit));
        sp.delete('page');
        return sp;
      },
      { replace: true }
    );
  };

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    if (page !== 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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

          <SuperAdminPropertySubscriptionsSummaryCards summary={summary} />

          <SuperAdminPropertySubscriptionsToolbar
            filters={filters}
            viewMode={viewMode}
            plans={planOptions}
            hideTableView={isMobileLayout}
            limit={limit}
            onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
            onPlanCodeChange={(planCode) => setFilters((current) => ({ ...current, planCode }))}
            onViewModeChange={setViewMode}
            onLimitChange={setLimit}
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
            totalCount={total}
          />

          {pageCount > 1 ? (
            <AdminListPagination
              ariaLabel="Property subscriptions pagination"
              page={page}
              pageCount={pageCount}
              pageItems={pageItems}
              isLoading={isLoading || isFetching}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
