import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import type { PlanFeatures } from '@/features/dashboard/plans/lib/planFeatures';
import type {
  PricingPlan,
  PropertySubscriptionSummary,
} from '@/features/dashboard/super-admin/types/pricingPlan';

import { ADMIN_DEFAULT_PAGE_SIZE } from '@/lib/table/pagination';

export const PRICING_PLANS_QUERY_KEY = ['super-admin', 'pricing-plans'] as const;
export const PROPERTY_SUBSCRIPTIONS_QUERY_KEY = ['super-admin', 'property-subscriptions'] as const;

export type PropertySubscriptionsSummary = {
  total: number;
  assigned: number;
  unassigned: number;
  activeSubscriptions: number;
  organizations: number;
};

export function usePricingPlans(
  search = '',
  status: 'all' | 'active' | 'inactive' = 'all',
  page = 1,
  limit: number = ADMIN_DEFAULT_PAGE_SIZE
) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (status !== 'all') params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));

  const query = useQuery({
    queryKey: [...PRICING_PLANS_QUERY_KEY, search, status, page, limit],
    queryFn: () =>
      callEdgeFunction<{ plans: PricingPlan[]; total: number }>(
        `pricing-plans?${params.toString()}`
      ),
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    rows: query.data?.plans ?? [],
    total: query.data?.total ?? 0,
  };
}

export function useUpdatePricingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planId: string;
      name?: string;
      tagline?: string | null;
      sortOrder?: number;
      pricePhp?: number | null;
      discountPercent?: number;
      features?: PlanFeatures;
      isActive?: boolean;
    }) =>
      callEdgeFunction<{ plan: PricingPlan }>('pricing-plans', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }).then((data) => data.plan),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: PRICING_PLANS_QUERY_KEY });
    },
  });
}

export function usePropertySubscriptionsAdmin(
  search: string,
  planCode: string,
  page = 1,
  limit: number = ADMIN_DEFAULT_PAGE_SIZE
) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (planCode.trim() && planCode !== 'all') params.set('planCode', planCode.trim());
  params.set('page', String(page));
  params.set('limit', String(limit));
  const qs = params.toString();

  const query = useQuery({
    queryKey: [...PROPERTY_SUBSCRIPTIONS_QUERY_KEY, search, planCode, page, limit],
    queryFn: () =>
      callEdgeFunction<{ properties: PropertySubscriptionSummary[]; total: number }>(
        `property-subscriptions-admin?${qs}`
      ),
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    rows: query.data?.properties ?? [],
    total: query.data?.total ?? 0,
  };
}

/** Platform-wide (unfiltered) aggregate counts for the summary cards. */
export function usePropertySubscriptionsSummary() {
  const query = useQuery({
    queryKey: [...PROPERTY_SUBSCRIPTIONS_QUERY_KEY, 'summary'],
    queryFn: () =>
      callEdgeFunction<{ summary: PropertySubscriptionsSummary }>(
        'property-subscriptions-admin?summary=true'
      ).then((data) => data.summary),
  });

  return {
    ...query,
    summary: query.data ?? null,
  };
}

export function useAssignPropertyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { propertyId: string; planId: string; note?: string }) =>
      callEdgeFunction('property-subscriptions-admin', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: PROPERTY_SUBSCRIPTIONS_QUERY_KEY });
    },
  });
}
