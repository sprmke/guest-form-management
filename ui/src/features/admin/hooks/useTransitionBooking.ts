import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { BookingStatus } from '@/features/admin/lib/bookingStatus';
import type { SdBank } from '@/features/sd-form/lib/sdFormSchema';
import { BOOKING_QUERY_KEY } from '@/features/admin/hooks/useBooking';
import { BOOKINGS_QUERY_KEY } from '@/features/admin/hooks/useBookings';

export type TransitionPayload = {
  booking_rate?: number | null;
  down_payment?: number | null;
  security_deposit?: number | null;
  pet_fee?: number | null;
  parking_rate_guest?: number | null;
  guest_additional_fee?: number | null;
  surprise_decor_staff_acknowledged?: boolean;
  parking_rate_paid?: number | null;
  parking_owner_email?: string | null;
  parking_owner?: string | null;
  parking_endorsement_url?: string | null;
  sd_additional_expense_items?: Array<{ label: string; amount: number }> | null;
  sd_additional_profit_items?: Array<{ label: string; amount: number }> | null;
  sd_additional_expenses?: number[] | null;
  sd_additional_profits?: number[] | null;
  sd_refund_amount?: number | null;
  sd_refund_receipt_url?: string | null;
  guest_balance_paid_amount?: number | null;
  guest_balance_payment_receipt_url?: string | null;
  sd_refund_guest_feedback?: string | null;
  sd_refund_method?: 'same_phone' | 'other_bank' | 'cash' | null;
  sd_refund_phone_confirmed?: boolean | null;
  sd_refund_bank?: SdBank | null;
  sd_refund_account_name?: string | null;
  sd_refund_account_number?: string | null;
  approved_gaf_pdf_url?: string | null;
  approved_pet_pdf_url?: string | null;
  document_completion_target?:
    | 'PENDING_GAF'
    | 'PENDING_PARKING_REQUEST'
    | 'PENDING_PET_REQUEST'
    | null;
  document_completion_clear_target?:
    | 'PENDING_GAF'
    | 'PENDING_PARKING_REQUEST'
    | 'PENDING_PET_REQUEST'
    | null;
};

export type DevControlFlags = {
  saveToDatabase?: boolean;
  generatePdf?: boolean;
  updateGoogleCalendar?: boolean;
  updateGoogleSheets?: boolean;
  sendGafRequestEmail?: boolean;
  sendParkingBroadcastEmail?: boolean;
  sendPetRequestEmail?: boolean;
  sendBookingAcknowledgementEmail?: boolean;
  sendReadyForCheckinEmail?: boolean;
  sendSdRefundFormEmail?: boolean;
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
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(variables.bookingId) });
      await qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
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
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(variables.bookingId) });
      await qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
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
  /** Sub-steps re-completed from existing `approved_*_pdf_url` after admin “mark incomplete”. */
  reconciled?: number;
  reconciledGaf?: number;
  reconciledPet?: number;
  transitioned?: number;
  scanned?: number;
  /** True when `sd-refund-cron` was called with `{ bookingId }` (admin detail only). */
  scoped?: boolean;
  transitionedSdEmailSent?: number;
  transitionedSdEmailSuppressed?: number;
  /** Cron sent check-out email while booking stayed READY_FOR_CHECKIN (awaiting settlement). */
  checkoutEmailsSent?: number;
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
        throw new Error(
          'Gmail OAuth expired — open Admin → Settings and use “Reconnect Gmail”, or re-run `npm run gmail-auth` for legacy env tokens.',
        );
      }
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json as RunAutomationResult;
    },
    onSuccess: async () => {
      if (!bookingId) return;
      // Await so mutateAsync does not resolve until detail + list refetches finish (avoids stale UI).
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
      await qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

/**
 * Manually trigger the SD refund cron (Phase 4 — Q6.6).
 * When `bookingId` is set, POSTs `{ bookingId }` so only that row is evaluated (same rules as scheduled cron).
 * Invalidates the booking detail so status updates show immediately.
 */
export function useRunSdRefundCron(bookingId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<RunAutomationResult> => {
      const jwt = await getAdminJwt();

      const res = await fetch(`${FUNCTIONS_URL}/sd-refund-cron`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          ...(bookingId
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        body: bookingId ? JSON.stringify({ bookingId }) : undefined,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json as RunAutomationResult;
    },
    onSuccess: async () => {
      if (!bookingId) return;
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
      await qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

/**
 * Re-send the guest Check-out & SD Refund Details email (READY_FOR_CHECKIN or READY_FOR_CHECKOUT).
 */
export function useResendSdRefundFormEmail(bookingId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{
      success: boolean;
      skipped?: boolean;
      reason?: string;
    }> => {
      if (!bookingId) throw new Error('bookingId is required');
      const jwt = await getAdminJwt();

      const res = await fetch(`${FUNCTIONS_URL}/send-sd-refund-form-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ bookingId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json;
    },
    onSuccess: async () => {
      if (!bookingId) return;
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
      await qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}
