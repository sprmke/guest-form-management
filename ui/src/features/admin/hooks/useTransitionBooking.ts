import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { BookingStatus } from '@/features/admin/lib/bookingStatus';
import { BOOKING_QUERY_KEY } from '@/features/admin/hooks/useBooking';
import { BOOKINGS_QUERY_KEY } from '@/features/admin/hooks/useBookings';

export type TransitionPayload = {
  booking_rate?: number | null;
  down_payment?: number | null;
  security_deposit?: number | null;
  pet_fee?: number | null;
  parking_rate_paid?: number | null;
  parking_owner_email?: string | null;
  parking_endorsement_url?: string | null;
  sd_additional_expenses?: number[] | null;
  sd_additional_profits?: number[] | null;
  sd_refund_amount?: number | null;
  sd_refund_receipt_url?: string | null;
  approved_gaf_pdf_url?: string | null;
  approved_pet_pdf_url?: string | null;
};

export type DevControlFlags = {
  saveToDatabase?: boolean;
  updateGoogleCalendar?: boolean;
  updateGoogleSheets?: boolean;
  sendGafRequestEmail?: boolean;
  sendParkingBroadcastEmail?: boolean;
  sendPetRequestEmail?: boolean;
  sendBookingAcknowledgementEmail?: boolean;
  sendReadyForCheckinEmail?: boolean;
};

type TransitionInput = {
  bookingId: string;
  toStatus: BookingStatus;
  payload?: TransitionPayload;
  devControls?: DevControlFlags;
  manual?: boolean;
};

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

async function callTransitionBooking(input: TransitionInput) {
  const jwt = await getAdminJwt();

  const res = await fetch(`${FUNCTIONS_URL}/transition-booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      bookingId: input.bookingId,
      toStatus: input.toStatus,
      payload: input.payload ?? {},
      devControls: input.devControls ?? {},
      manual: input.manual ?? true,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  return json.data;
}

/**
 * Mutation hook for booking transitions.
 * On success, invalidates both the single-booking cache and the list cache.
 */
export function useTransitionBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: callTransitionBooking,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(variables.bookingId) });
      qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for cancelling a booking (calls cancel-booking function).
 */
export function useCancelBooking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      devControls = {},
    }: {
      bookingId: string;
      devControls?: DevControlFlags;
    }) => {
      const jwt = await getAdminJwt();

      const res = await fetch(`${FUNCTIONS_URL}/cancel-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ bookingId, confirm: true, devControls }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(variables.bookingId) });
      qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

// ─── Manual automation triggers (Q6.6) ───────────────────────────────────────
// These invoke the same scheduled edge functions that Supabase cron calls,
// but triggered manually by an admin when automation is late or stuck.

type RunAutomationResult = {
  success: boolean;
  applied?: number;
  skipped?: number;
  failed?: number;
  transitioned?: number;
  scanned?: number;
  initialized?: boolean;
  historyReset?: boolean;
  [key: string]: unknown;
};

/**
 * Manually trigger the Gmail listener poll (Phase 4 — Q6.6).
 * Use when PENDING_GAF / PENDING_PET_REQUEST is stuck and the cron hasn't fired.
 * Invalidates the booking detail so status updates show immediately.
 */
export function useRunGmailPoll(bookingId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<RunAutomationResult> => {
      const jwt = await getAdminJwt();

      const res = await fetch(`${FUNCTIONS_URL}/gmail-listener`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const json = await res.json();
      if (!json.success && json.needsReAuth) {
        throw new Error('Gmail OAuth expired — re-run `npm run gmail-auth` to refresh the token.');
      }
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json as RunAutomationResult;
    },
    onSuccess: () => {
      if (bookingId) {
        qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
        qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      }
    },
  });
}

/**
 * Manually trigger the SD refund cron (Phase 4 — Q6.6).
 * Use when READY_FOR_CHECKIN is stuck and the cron hasn't fired after checkout.
 * Invalidates the booking detail so status updates show immediately.
 */
export function useRunSdRefundCron(bookingId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<RunAutomationResult> => {
      const jwt = await getAdminJwt();

      const res = await fetch(`${FUNCTIONS_URL}/sd-refund-cron`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json as RunAutomationResult;
    },
    onSuccess: () => {
      if (bookingId) {
        qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
        qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      }
    },
  });
}
