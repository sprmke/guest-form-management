import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { BookingRow } from '@/features/admin/lib/types';
import { normalizeBookingStorageUrls } from '@/features/admin/lib/storageUrls';

export const BOOKING_QUERY_KEY = (id: string) => ['booking', id] as const;
const BOOKING_POLL_INTERVAL_MS = 15_000;

/** Fetches a single booking row by ID from guest_submissions (admin session required). */
export function useBooking(bookingId: string | undefined) {
  return useQuery<BookingRow | null>({
    queryKey: BOOKING_QUERY_KEY(bookingId ?? ''),
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from('guest_submissions')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }

      const row = (data ?? null) as BookingRow | null;
      return row ? normalizeBookingStorageUrls(row) : null;
    },
    enabled: !!bookingId,
    staleTime: 10_000,
    refetchInterval: BOOKING_POLL_INTERVAL_MS,
    // Keep polling lightweight: refresh while detail page is active, pause in background tabs.
    refetchIntervalInBackground: false,
  });
}
