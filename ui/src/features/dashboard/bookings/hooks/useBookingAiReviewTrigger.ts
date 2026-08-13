import { useMutation, useQueryClient } from '@tanstack/react-query';

import { bookingDetailQueryKey } from '@/features/dashboard/bookings/hooks/useBooking';
import { bookingAiReviewQueryKey } from '@/features/dashboard/bookings/hooks/useBookingAiReview';
import { buildOptimisticProcessingReview } from '@/features/dashboard/bookings/lib/bookingAiReviewProgress';
import type { BookingAiReview } from '@/features/dashboard/bookings/lib/types';
import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { supabase } from '@/lib/supabase/client';

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

async function triggerBookingAiReview(
  bookingId: string,
  propertyId: string | null
): Promise<BookingAiReview> {
  const jwt = await getAdminJwt();
  const res = await fetch(scopedFunctionsUrl('/booking-ai-review', propertyId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ bookingId, force: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json.data as BookingAiReview;
}

export function useBookingAiReviewTrigger(
  bookingId: string | null | undefined,
  onSuccess?: (data: BookingAiReview) => void
) {
  const qc = useQueryClient();
  const propertyId = usePropertyIdParam();
  const queryKey = bookingAiReviewQueryKey(bookingId ?? null, propertyId);

  return useMutation({
    mutationFn: () => triggerBookingAiReview(bookingId as string, propertyId),
    onMutate: async () => {
      if (!bookingId) return {};
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<BookingAiReview | null>(queryKey);
      qc.setQueryData(queryKey, buildOptimisticProcessingReview(bookingId));
      void qc.invalidateQueries({ queryKey, refetchType: 'active' });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKey, data);
      if (data.job_status === 'completed' || data.job_status === 'failed') {
        void qc.invalidateQueries({
          queryKey: bookingDetailQueryKey(bookingId as string, propertyId),
        });
      }
      onSuccess?.(data);
    },
  });
}
