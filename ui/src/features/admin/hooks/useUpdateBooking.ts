/**
 * useUpdateBooking — mutation to patch guest_submissions directly via Supabase.
 *
 * Used by BookingEditForm. All writes go through the authenticated admin session.
 * If the booking is READY_FOR_CHECKIN and the caller passes `revertToPendingReview: true`,
 * this also resets status → PENDING_REVIEW.
 *
 * Admin-dashboard skill: "Guest fields stay editable even after READY_FOR_CHECKIN
 * but saving material changes from that status must revert status → PENDING_REVIEW."
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { BOOKING_QUERY_KEY } from './useBooking';
import type { BookingRow } from '../lib/types';

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
  payload: UpdateBookingPayload;
  /** When true, also resets status to PENDING_REVIEW (required for READY_FOR_CHECKIN edits). */
  revertToPendingReview?: boolean;
};

export function useUpdateBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, payload, revertToPendingReview }: MutationArgs) => {
      const patch: Record<string, unknown> = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      if (revertToPendingReview) {
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

    onSuccess: (updated, { bookingId }) => {
      qc.setQueryData(BOOKING_QUERY_KEY(bookingId), updated);
      void qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
