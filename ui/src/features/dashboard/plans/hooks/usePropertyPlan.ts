import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import {
  assignPropertyFreePlan,
  createPropertyPlanCheckout,
  fetchPropertyPlan,
  renewPropertyPlanCheckout,
  type PropertyPlanDto,
} from '@/features/dashboard/plans/lib/propertyPlanApi';

export const propertyPlanQueryKey = (propertyId: string) =>
  ['property', propertyId, 'plan'] as const;

export function usePropertyPlan() {
  const propertyId = usePropertyIdParam();

  return useQuery({
    queryKey: propertyPlanQueryKey(propertyId ?? ''),
    queryFn: () => fetchPropertyPlan(propertyId!),
    enabled: Boolean(propertyId),
    staleTime: 60_000,
  });
}

export function useAssignPropertyFreePlan() {
  const propertyId = usePropertyIdParam();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => assignPropertyFreePlan(propertyId!, planId),
    onSuccess: async () => {
      if (propertyId) {
        await queryClient.invalidateQueries({ queryKey: propertyPlanQueryKey(propertyId) });
      }
      toast.success('Plan updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not update plan');
    },
  });
}

export function useCreatePropertyPlanCheckout() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: (planId: string) => createPropertyPlanCheckout(propertyId!, planId),
    onError: (error: Error) => {
      toast.error(error.message || 'Could not start checkout');
    },
  });
}

export function useRenewPropertyPlanCheckout() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: () => renewPropertyPlanCheckout(propertyId!),
    onError: (error: Error) => {
      toast.error(error.message || 'Could not start checkout');
    },
  });
}

export function isCurrentPlan(plan: PropertyPlanDto, currentPlanId: string | undefined): boolean {
  return Boolean(currentPlanId && plan.id === currentPlanId);
}
