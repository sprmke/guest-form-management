/**
 * useSaveParkingRateGuest — admin-only patch of pay-parking settings before sharing
 * the link or opening the form (rate + parking date window).
 *
 * When parking is added or updated at Ready for Check-in+, clears
 * `parking_completed_at` so the Parking Request sub-step must be completed again.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { BOOKING_QUERY_KEY } from "@/features/admin/hooks/useBooking";
import { isPostPendingDocumentsStatus } from "@/features/admin/lib/workflow";

type Args = {
  bookingId: string;
  parkingRateGuest: number;
  parkingCheckInDate: string;
  parkingCheckOutDate: string;
  bookingStatus?: string;
  parkingCompletedAt?: string | null;
};

export function useSaveParkingRateGuest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      parkingRateGuest,
      parkingCheckInDate,
      parkingCheckOutDate,
      bookingStatus,
      parkingCompletedAt,
    }: Args) => {
      if (!Number.isFinite(parkingRateGuest) || parkingRateGuest <= 0) {
        throw new Error("Enter a parking rate greater than 0");
      }
      if (!parkingCheckInDate.trim() || !parkingCheckOutDate.trim()) {
        throw new Error("Select parking check-in and check-out dates");
      }

      const patch: Record<string, unknown> = {
        parking_rate_guest: parkingRateGuest,
        parking_check_in_date: parkingCheckInDate,
        parking_check_out_date: parkingCheckOutDate,
        need_parking: true,
        updated_at: new Date().toISOString(),
      };

      if (
        parkingCompletedAt ||
        (bookingStatus && isPostPendingDocumentsStatus(bookingStatus))
      ) {
        patch.parking_completed_at = null;
      }

      const { error } = await supabase
        .from("guest_submissions")
        .update(patch)
        .eq("id", bookingId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { bookingId }) => {
      void qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
    },
  });
}
