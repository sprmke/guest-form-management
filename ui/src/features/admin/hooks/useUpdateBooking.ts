/**
 * useUpdateBooking — mutation to patch guest_submissions directly via Supabase.
 *
 * Used by BookingEditForm. All writes go through the authenticated admin session.
 * When `revertToPendingReview` is true and `currentStatus` is in the documents pipeline
 * or Ready for check-in (see `shouldRevertGuestFieldEditsToPendingReview` in
 * `bookingStatus.ts`), this also resets status → PENDING_REVIEW. The caller should set
 * `revertToPendingReview` only when workflow-sensitive guest fields changed.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { BOOKING_QUERY_KEY } from './useBooking';
import type { BookingRow } from '../lib/types';
import { shouldRevertGuestFieldEditsToPendingReview } from '../lib/bookingStatus';

export type UpdateBookingPayload = {
  // Guest identity
  guest_facebook_name?: string;
  primary_guest_name?: string;
  guest_email?: string;
  guest_phone_number?: string;
  guest_address?: string | null;
  nationality?: string | null;

  // Additional guests
  guest2_name?: string | null;
  guest3_name?: string | null;
  guest4_name?: string | null;
  guest5_name?: string | null;

  // Stay details
  check_in_date?: string;
  check_out_date?: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  number_of_adults?: number;
  number_of_children?: number | null;
  number_of_nights?: number;

  // Parking
  need_parking?: boolean;
  car_plate_number?: string | null;
  car_brand_model?: string | null;
  car_color?: string | null;

  // Pets
  has_pets?: boolean;
  pet_name?: string | null;
  pet_type?: string | null;
  pet_breed?: string | null;
  pet_age?: string | null;
  pet_vaccination_date?: string | null;

  // Other
  find_us?: string | null;
  find_us_details?: string | null;
  guest_special_requests?: string | null;
};

type MutationArgs = {
  bookingId: string;
  /** Row status at submit time — used to gate status reset. */
  currentStatus: string;
  payload: UpdateBookingPayload;
  /** When true (and current status allows), also resets status to PENDING_REVIEW. */
  revertToPendingReview?: boolean;
};

export function useUpdateBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      currentStatus,
      payload,
      revertToPendingReview,
    }: MutationArgs) => {
      const patch: Record<string, unknown> = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      if (
        revertToPendingReview &&
        shouldRevertGuestFieldEditsToPendingReview(currentStatus)
      ) {
        patch.status = 'PENDING_REVIEW';
        patch.status_updated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('guest_submissions')
        .update(patch)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as BookingRow;
    },

    onSuccess: async (updated, { bookingId }) => {
      qc.setQueryData(BOOKING_QUERY_KEY(bookingId), updated);
      await qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
