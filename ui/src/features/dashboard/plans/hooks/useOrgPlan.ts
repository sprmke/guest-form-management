import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  applyOrgPlanDowngrade,
  createOrgPlanCheckout,
  fetchOrgPlan,
} from '@/features/dashboard/plans/lib/orgPlanApi';

export const orgPlanQueryKey = (orgId: string) => ['org', orgId, 'plan'] as const;

/** `orgId` is explicit (not read from route context) — this page renders org-only routes,
 * which don't populate the property-scoped org context `useOrgIdParam()` relies on. */
export function useOrgPlan(orgId: string | null) {
  return useQuery({
    queryKey: orgPlanQueryKey(orgId ?? ''),
    queryFn: () => fetchOrgPlan(orgId!),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  });
}

export function useCreateOrgPlanCheckout(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId }: { planId: string }) => createOrgPlanCheckout(orgId!, planId),
    onSuccess: async () => {
      if (orgId) {
        await queryClient.invalidateQueries({ queryKey: orgPlanQueryKey(orgId) });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not start checkout');
    },
  });
}

export function useApplyOrgPlanDowngrade(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId }: { planId: string }) => applyOrgPlanDowngrade(orgId!, planId),
    onSuccess: async (result) => {
      if (orgId) {
        await queryClient.invalidateQueries({ queryKey: orgPlanQueryKey(orgId) });
        await queryClient.invalidateQueries({ queryKey: ['org', orgId] });
        await queryClient.invalidateQueries({ queryKey: ['property'] });
        await queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey.includes('entitlements'),
        });
      }
      toast.success(result.toFree ? 'Moved to Free' : 'Plan updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not change plan');
    },
  });
}
