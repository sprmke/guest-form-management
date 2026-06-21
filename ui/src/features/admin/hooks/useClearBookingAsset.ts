/**
 * useClearBookingAsset — clears a booking document URL (+ AI verdict columns when applicable).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { BOOKING_QUERY_KEY } from '@/features/admin/hooks/useBooking';
import { BOOKINGS_QUERY_KEY } from '@/features/admin/hooks/useBookings';
import { bookingAssetClearPatch } from '@/features/admin/lib/bookingAssetClearPatch';
import type { AssetType } from '@/features/admin/hooks/useUploadBookingAsset';

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
    },
  });
}
