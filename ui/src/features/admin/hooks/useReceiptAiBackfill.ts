/**
 * One-shot AI receipt backfill when opening a booking that has receipt URLs
 * but no persisted verdict (legacy rows before validation shipped).
 */

import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { BookingRow } from '@/features/admin/lib/types';
import { BOOKING_QUERY_KEY } from './useBooking';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED']);

function receiptUrlNeedsAiBackfill(
  url: string | null | undefined,
  verdict: string | null | undefined,
): boolean {
  return Boolean(url?.trim()) && !String(verdict ?? '').trim();
}

export function bookingNeedsReceiptAiBackfill(
  booking: Pick<
    BookingRow,
    | 'status'
    | 'payment_receipt_url'
    | 'dp_receipt_ai_verdict'
    | 'guest_balance_payment_receipt_url'
    | 'balance_receipt_ai_verdict'
    | 'parking_payment_receipt_url'
    | 'parking_receipt_ai_verdict'
  >,
): boolean {
  if (TERMINAL_STATUSES.has(String(booking.status ?? ''))) return false;
  if (
    receiptUrlNeedsAiBackfill(
      booking.payment_receipt_url,
      booking.dp_receipt_ai_verdict,
    )
  ) {
    return true;
  }
  if (
    receiptUrlNeedsAiBackfill(
      booking.guest_balance_payment_receipt_url,
      booking.balance_receipt_ai_verdict,
    )
  ) {
    return true;
  }
  if (
    receiptUrlNeedsAiBackfill(
      booking.parking_payment_receipt_url,
      booking.parking_receipt_ai_verdict,
    )
  ) {
    return true;
  }
  return false;
}

export function receiptAiPreviewLoading(
  isBackfilling: boolean,
  url: string | null | undefined,
  verdict: string | null | undefined,
): boolean {
  return isBackfilling && receiptUrlNeedsAiBackfill(url, verdict);
}

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useReceiptAiBackfill(booking: BookingRow | null | undefined) {
  const qc = useQueryClient();
  const attemptedForId = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/validate-booking-receipts`, {
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
      return json.data as { validated: unknown[] };
    },
    onSuccess: async (_, bookingId) => {
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
    },
  });

  useEffect(() => {
    if (!booking?.id) return;
    if (attemptedForId.current === booking.id) return;
    if (!bookingNeedsReceiptAiBackfill(booking)) return;

    attemptedForId.current = booking.id;
    mutation.mutate(booking.id);
  }, [
    booking?.id,
    booking?.status,
    booking?.payment_receipt_url,
    booking?.dp_receipt_ai_verdict,
    booking?.guest_balance_payment_receipt_url,
    booking?.balance_receipt_ai_verdict,
    booking?.parking_payment_receipt_url,
    booking?.parking_receipt_ai_verdict,
    mutation.mutate,
  ]);

  return { isBackfilling: mutation.isPending };
}
