/**
 * Manually refresh Google Calendar + Sheets from the current DB row
 * (`sync-booking-integrations`). Use when a transition succeeded in-app but
 * the calendar event title/color stayed on an older status.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { BOOKING_QUERY_KEY } from './useBooking';
import { BOOKINGS_QUERY_KEY } from './useBookings';

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';

export function useSyncBookingIntegrations(bookingId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!FUNCTIONS_URL.trim()) {
        throw new Error('VITE_SUPABASE_URL is not configured');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;
      if (!jwt) throw new Error('No active session — please sign in');

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
          calendar?: { success?: boolean; updated?: number; created?: boolean; skipped?: boolean };
          sheet?: { success?: boolean };
        };
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      return json.data;
    },
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
      await qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });

      const cal = data?.calendar;
      if (cal?.skipped) {
        toast.warning(
          'Google Calendar credentials are not configured — Sheet sync may still have run.',
        );
        return;
      }
      if (cal?.updated === 0 && !cal?.created) {
        toast.warning(
          'No matching Google Calendar event found. Check that the event description includes this booking ID.',
        );
        return;
      }
      toast.success('Google Calendar and Sheet refreshed from this booking.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not refresh integrations');
    },
  });
}
