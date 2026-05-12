import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { BookingRow } from '@/features/admin/lib/types';

export const BOOKING_QUERY_KEY = (id: string) => ['booking', id] as const;

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

      return (data ?? null) as BookingRow | null;
    },
    enabled: !!bookingId,
    staleTime: 10_000,
  });
}
