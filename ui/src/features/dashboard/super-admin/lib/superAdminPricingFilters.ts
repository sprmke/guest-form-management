import type { SuperAdminListViewMode } from '@/features/dashboard/super-admin/lib/superAdminListViewMode';
import type {
  PricingPlan,
  PropertySubscriptionSummary,
} from '@/features/dashboard/super-admin/types/pricingPlan';

export type SuperAdminPricingPlansViewMode = SuperAdminListViewMode;
export type SuperAdminPropertySubscriptionsViewMode = SuperAdminListViewMode;

export type SuperAdminPricingPlansFilters = {
  search: string;
  model: 'all' | 'subscription' | 'commission';
  status: 'all' | 'active' | 'inactive';
};

export type SuperAdminPropertySubscriptionsFilters = {
  search: string;
  planCode: 'all' | string;
};

export const DEFAULT_SUPER_ADMIN_PRICING_PLANS_FILTERS: SuperAdminPricingPlansFilters = {
  search: '',
  model: 'all',
  status: 'all',
};

export const DEFAULT_SUPER_ADMIN_PROPERTY_SUBSCRIPTIONS_FILTERS: SuperAdminPropertySubscriptionsFilters =
  {
    search: '',
    planCode: 'all',
  };

function planSearchHaystack(plan: PricingPlan): string {
  return [plan.name, plan.code, plan.tagline, plan.pricingModel]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterSuperAdminPricingPlans(
  plans: PricingPlan[],
  filters: SuperAdminPricingPlansFilters
): PricingPlan[] {
  const term = filters.search.trim().toLowerCase();
  return plans.filter((plan) => {
    if (filters.model !== 'all' && plan.pricingModel !== filters.model) return false;
    if (filters.status === 'active' && !plan.isActive) return false;
    if (filters.status === 'inactive' && plan.isActive) return false;
    if (!term) return true;
    return planSearchHaystack(plan).includes(term);
  });
}

export function superAdminPricingPlansHasActiveFilters(
  filters: SuperAdminPricingPlansFilters
): boolean {
  return filters.search.trim() !== '' || filters.model !== 'all' || filters.status !== 'all';
}

export function superAdminPricingPlansSummaryFromList(plans: PricingPlan[]) {
  const subscriptionPlans = plans.filter((plan) => plan.pricingModel === 'subscription');
  const commissionPlans = plans.filter((plan) => plan.pricingModel === 'commission');
  const activePlans = plans.filter((plan) => plan.isActive).length;
  const defaultPlan = plans.find((plan) => plan.isDefault);

  return {
    total: plans.length,
    subscriptionTiers: subscriptionPlans.length,
    commissionPlans: commissionPlans.length,
    activePlans,
    defaultPlanName: defaultPlan?.name ?? '—',
  };
}

function propertySubscriptionHaystack(row: PropertySubscriptionSummary): string {
  return [
    row.propertyName,
    row.propertySlug,
    row.organizationName,
    row.organizationSlug,
    row.subscription?.planName,
    row.subscription?.planCode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterSuperAdminPropertySubscriptions(
  properties: PropertySubscriptionSummary[],
  filters: SuperAdminPropertySubscriptionsFilters
): PropertySubscriptionSummary[] {
  const term = filters.search.trim().toLowerCase();
  return properties.filter((row) => {
    if (filters.planCode !== 'all') {
      const code = row.subscription?.planCode ?? '';
      if (code !== filters.planCode) return false;
    }
    if (!term) return true;
    return propertySubscriptionHaystack(row).includes(term);
  });
}

export function superAdminPropertySubscriptionsHasActiveFilters(
  filters: SuperAdminPropertySubscriptionsFilters
): boolean {
  return filters.search.trim() !== '' || filters.planCode !== 'all';
}

export function superAdminPropertySubscriptionsSummaryFromList(
  properties: PropertySubscriptionSummary[]
) {
  const assigned = properties.filter((row) => row.subscription).length;
  const unassigned = properties.length - assigned;
  const activeSubscriptions = properties.filter(
    (row) => row.subscription?.status === 'active'
  ).length;
  const organizations = new Set(properties.map((row) => row.organizationId)).size;

  return {
    total: properties.length,
    assigned,
    unassigned,
    activeSubscriptions,
    organizations,
  };
}
