import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createOrgPlanCheckout, fetchOrgPlan } from '@/features/dashboard/plans/lib/orgPlanApi';

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
    mutationFn: ({ planId, propertyIds }: { planId: string; propertyIds: string[] }) =>
      createOrgPlanCheckout(orgId!, planId, propertyIds),
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
