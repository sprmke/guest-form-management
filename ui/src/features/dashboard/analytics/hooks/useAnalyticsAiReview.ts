import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  fetchAnalyticsAiReview,
  regenerateAnalyticsAiReview,
} from '@/features/dashboard/analytics/hooks/useAnalyticsApi';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

export const ANALYTICS_AI_REVIEW_KEY = ['analytics-ai-review'] as const;

export function useAnalyticsAiReview() {
  const propertyId = usePropertyIdParam();
  return useQuery({
    queryKey: [...ANALYTICS_AI_REVIEW_KEY, propertyId] as const,
    queryFn: () => fetchAnalyticsAiReview(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60_000,
  });
}

export function useRegenerateAnalyticsAiReview() {
  const propertyId = usePropertyIdParam();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateAnalyticsAiReview(propertyId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: [...ANALYTICS_AI_REVIEW_KEY, propertyId] });
      if (!result.available) {
        toast.info('AI review is unavailable right now — showing your last one.');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not regenerate the AI performance review');
    },
  });
}
