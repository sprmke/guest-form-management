/**
 * Lightweight host "Find parking" setup — marks `need_parking` without legacy
 * rate/date modal. Marketplace pricing lives on parking listings / platform settings.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BOOKING_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBooking';
import { isPostPendingDocumentsStatus } from '@/features/dashboard/bookings/lib/workflow';

import { supabase } from '@/lib/supabase/client';

type Args = {
  bookingId: string;
  bookingStatus?: string;
  parkingCompletedAt?: string | null;
  alreadyNeedParking?: boolean | null;
};

export function useEnsureNeedParking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      bookingStatus,
      parkingCompletedAt,
      alreadyNeedParking,
    }: Args) => {
      if (alreadyNeedParking === true) return { skipped: true as const };

      const patch: Record<string, unknown> = {
        need_parking: true,
        updated_at: new Date().toISOString(),
      };

      if (parkingCompletedAt || (bookingStatus && isPostPendingDocumentsStatus(bookingStatus))) {
        patch.parking_completed_at = null;
      }

      const { error } = await supabase.from('guest_submissions').update(patch).eq('id', bookingId);
      if (error) throw new Error(error.message);
      return { skipped: false as const };
    },
    onSuccess: (_data, { bookingId }) => {
      void qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
    },
  });
}
