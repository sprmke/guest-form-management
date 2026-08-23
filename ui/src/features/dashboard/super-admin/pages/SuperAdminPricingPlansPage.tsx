import { useMemo, useState } from 'react';

import { Layers } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminEmptyState } from '@/features/dashboard/super-admin/components/shared/SuperAdminEmptyState';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import { EditPricingPlanDialog } from '@/features/dashboard/super-admin/components/super-admin-pricing/EditPricingPlanDialog';
import {
  SuperAdminPricingPlanCard,
  SuperAdminPricingPlansEmptyState,
} from '@/features/dashboard/super-admin/components/super-admin-pricing/SuperAdminPricingPlanCard';
import { SuperAdminPricingPlansTable } from '@/features/dashboard/super-admin/components/super-admin-pricing/SuperAdminPricingPlansTable';
import {
  SuperAdminPricingPlansResultsMeta,
  SuperAdminPricingPlansToolbar,
} from '@/features/dashboard/super-admin/components/super-admin-pricing/SuperAdminPricingPlansToolbar';
import { SuperAdminPricingSummaryCards } from '@/features/dashboard/super-admin/components/super-admin-pricing/SuperAdminPricingSummaryCards';
import {
  usePricingPlans,
  useUpdatePricingPlan,
} from '@/features/dashboard/super-admin/hooks/usePricingPlans';
import {
  DEFAULT_SUPER_ADMIN_PRICING_PLANS_FILTERS,
  filterSuperAdminPricingPlans,
  superAdminPricingPlansHasActiveFilters,
  type SuperAdminPricingPlansViewMode,
} from '@/features/dashboard/super-admin/lib/superAdminPricingFilters';
import type { PricingPlan } from '@/features/dashboard/super-admin/types/pricingPlan';


import { useAdminMobileGridViewGuard } from '@/hooks/useAdminMobileGridViewGuard';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { usePageTitle } from '@/lib/pageTitle';

export function SuperAdminPricingPlansPage() {
  usePageTitle('Kame Homes - Pricing plans');
  const { data: plans = [], isLoading, error } = usePricingPlans();
  const updatePlan = useUpdatePricingPlan();
  const [editing, setEditing] = useState<PricingPlan | null>(null);
  const [viewMode, setViewMode] = useState<SuperAdminPricingPlansViewMode>('table');
  const [filters, setFilters] = useState(DEFAULT_SUPER_ADMIN_PRICING_PLANS_FILTERS);
  const isMobileLayout = useIsBelowLg();
  useAdminMobileGridViewGuard(isMobileLayout, viewMode, setViewMode);

  const filteredPlans = useMemo(
    () => filterSuperAdminPricingPlans(plans, filters),
    [plans, filters]
  );
  const hasActiveFilters = superAdminPricingPlansHasActiveFilters(filters);
  const showTableView = viewMode === 'table' && !isMobileLayout;

  const subscriptionPlans = useMemo(
    () => plans.filter((plan) => plan.pricingModel === 'subscription'),
    [plans]
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {isLoading ? (
        <SuperAdminPageLoading metricCount={4} />
      ) : error ? (
        <p className="text-destructive text-sm">Could not load pricing plans.</p>
      ) : (
        <>
          <AdminPageHeader
            title="Pricing plans"
            subtitle="Subscription tiers and commission model."
          />

          <SuperAdminPricingSummaryCards plans={plans} />

          <SuperAdminPricingPlansToolbar
            filters={filters}
            viewMode={viewMode}
            hideTableView={isMobileLayout}
            onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
            onModelChange={(model) => setFilters((current) => ({ ...current, model }))}
            onStatusChange={(status) => setFilters((current) => ({ ...current, status }))}
            onViewModeChange={setViewMode}
          />

          {filteredPlans.length > 0 ? (
            showTableView ? (
              <SuperAdminPricingPlansTable plans={filteredPlans} onEdit={setEditing} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {filteredPlans.map((plan) => (
                  <SuperAdminPricingPlanCard key={plan.id} plan={plan} onEdit={setEditing} />
                ))}
              </div>
            )
          ) : plans.length === 0 ? (
            <SuperAdminEmptyState icon={Layers} title="No pricing plans yet" />
          ) : (
            <SuperAdminPricingPlansEmptyState filtered={hasActiveFilters} />
          )}

          <SuperAdminPricingPlansResultsMeta
            visibleCount={filteredPlans.length}
            totalCount={plans.length}
          />

          {!isLoading && !error && subscriptionPlans.length !== 5 ? (
            <p className="text-muted-foreground text-xs">
              Expected 5 subscription tiers; found {subscriptionPlans.length}.
            </p>
          ) : null}
        </>
      )}

      <EditPricingPlanDialog
        open={Boolean(editing)}
        plan={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={async (patch) => {
          if (!editing) return;
          try {
            await updatePlan.mutateAsync({ planId: editing.id, ...patch });
            toast.success('Plan saved');
            setEditing(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Save failed');
          }
        }}
        isSaving={updatePlan.isPending}
      />
    </div>
  );
}
