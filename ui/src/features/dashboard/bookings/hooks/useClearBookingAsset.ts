/**
 * useClearBookingAsset — clears a booking document URL (+ AI verdict columns when applicable).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BOOKING_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBooking';
import { invalidateBookingAiReviewQueries } from '@/features/dashboard/bookings/hooks/useBookingAiReview';
import { BOOKINGS_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBookings';
import type { AssetType } from '@/features/dashboard/bookings/hooks/useUploadBookingAsset';
import { bookingAssetClearPatch } from '@/features/dashboard/bookings/lib/bookingAssetClearPatch';

import { supabase } from '@/lib/supabase/client';

type ClearArgs = {
  bookingId: string;
  assetType: AssetType;
};

export function useClearBookingAsset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, assetType }: ClearArgs) => {
      const { error } = await supabase
        .from('guest_submissions')
        .update({
          ...bookingAssetClearPatch(assetType),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw new Error(error.message);
    },
    onSuccess: async (_, { bookingId }) => {
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
      await qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      await invalidateBookingAiReviewQueries(qc, bookingId);
    },
  });
}
