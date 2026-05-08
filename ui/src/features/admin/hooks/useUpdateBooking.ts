/**
 * useUpdateBooking — mutation to patch guest_submissions directly via Supabase.
 *
 * Used by BookingEditForm. All writes go through the authenticated admin session.
 * When `revertToPendingReview` is true and `currentStatus` is in the documents pipeline
 * or Ready for check-in (see `shouldRevertGuestFieldEditsToPendingReview` in
 * `bookingStatus.ts`), this also resets status → PENDING_REVIEW and merges
 * `pendingDocumentsClearPatchForGuestEditRevert` (nested doc completion, PDF URLs,
 * parking settlement, guest balance settlement — **not** pricing snapshot fields).
 * The caller should set `revertToPendingReview` only when workflow-sensitive guest fields changed.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import {
  toGuestSubmissionDate,
  toGuestSubmissionTime,
} from '@/utils/dates';
import { BOOKING_QUERY_KEY } from './useBooking';
import type { BookingRow } from '../lib/types';
import {
  pendingDocumentsClearPatchForGuestEditRevert,
  shouldRevertGuestFieldEditsToPendingReview,
} from '../lib/bookingStatus';

function patchGuestSubmissionForDb(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch };
  if (typeof out.check_in_date === 'string' && out.check_in_date) {
    out.check_in_date = toGuestSubmissionDate(out.check_in_date);
  }
  if (typeof out.check_out_date === 'string' && out.check_out_date) {
    out.check_out_date = toGuestSubmissionDate(out.check_out_date);
  }
  if (typeof out.check_in_time === 'string' && out.check_in_time) {
    out.check_in_time = toGuestSubmissionTime(out.check_in_time);
  }
  if (typeof out.check_out_time === 'string' && out.check_out_time) {
    out.check_out_time = toGuestSubmissionTime(out.check_out_time);
  }
  return out;
}

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';

/**
 * Refreshes Google Calendar + Sheets from the saved row (edge: `sync-booking-integrations`).
 * Best-effort: DB save already succeeded; warns when Google returns a hard failure.
 */
async function syncBookingIntegrationsAfterSave(bookingId: string): Promise<void> {
  if (!FUNCTIONS_URL.trim()) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) return;

  try {
    const res = await fetch(`${FUNCTIONS_URL}/sync-booking-integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ bookingId }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      data?: {
        calendar?: { success?: boolean; skipped?: boolean };
        sheet?: { success?: boolean; skipped?: boolean };
      };
    };

    if (!res.ok || json.success !== true) {
      toast.warning(
        json.error ??
          'Booking saved, but Google Calendar / Sheet sync failed. Check credentials or retry after a workflow step.',
      );
      return;
    }

    const cal = json.data?.calendar;
    const sh = json.data?.sheet;
    const calOk = cal?.skipped || cal?.success;
    const shOk = sh?.skipped || sh?.success;
    if (!calOk || !shOk) {
      toast.warning(
        'Booking saved. Google Calendar or Sheets reported an error refreshing — check logs or run a workflow action to retry.',
      );
    }
  } catch {
    toast.warning(
      'Booking saved, but we could not reach the sync service to refresh Google Calendar / Sheets.',
    );
  }
}

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
  guest_requests_surprise_decor?: boolean;
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
      let patch: Record<string, unknown> = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      patch = patchGuestSubmissionForDb(patch);

      if (
        revertToPendingReview &&
        shouldRevertGuestFieldEditsToPendingReview(currentStatus)
      ) {
        Object.assign(patch, pendingDocumentsClearPatchForGuestEditRevert());
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
      await syncBookingIntegrationsAfterSave(bookingId);
    },
  });
}
