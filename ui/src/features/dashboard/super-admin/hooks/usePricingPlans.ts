import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import type { PlanFeatures } from '@/features/dashboard/plans/lib/planFeatures';
import type {
  PricingPlan,
  PropertySubscriptionSummary,
} from '@/features/dashboard/super-admin/types/pricingPlan';

export const PRICING_PLANS_QUERY_KEY = ['super-admin', 'pricing-plans'] as const;
export const PROPERTY_SUBSCRIPTIONS_QUERY_KEY = ['super-admin', 'property-subscriptions'] as const;

export function usePricingPlans() {
  return useQuery({
    queryKey: PRICING_PLANS_QUERY_KEY,
    queryFn: () =>
      callEdgeFunction<{ plans: PricingPlan[] }>('pricing-plans').then((data) => data.plans),
  });
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
      commissionRatePercent?: number | null;
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

export function usePropertySubscriptionsAdmin(search: string, planCode: string, limit = 100) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (planCode.trim()) params.set('planCode', planCode.trim());
  if (limit !== 100) params.set('limit', String(limit));
  const qs = params.toString();

  return useQuery({
    queryKey: [...PROPERTY_SUBSCRIPTIONS_QUERY_KEY, search, planCode, limit],
    queryFn: () =>
      callEdgeFunction<{ properties: PropertySubscriptionSummary[] }>(
        `property-subscriptions-admin${qs ? `?${qs}` : ''}`
      ).then((data) => data.properties),
  });
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
