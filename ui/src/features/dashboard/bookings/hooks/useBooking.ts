import { useQuery } from '@tanstack/react-query';

import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { supabase } from '@/lib/supabase/client';

export const BOOKING_QUERY_KEY = (id: string) => ['booking', id] as const;

/** Full TanStack key for a property-scoped booking detail query. */
export function bookingDetailQueryKey(bookingId: string, propertyId: string | null) {
  return [...BOOKING_QUERY_KEY(bookingId), propertyId] as const;
}

/** Fetches a single booking row by ID from guest_submissions (admin session required). */
export function useBooking(bookingId: string | undefined) {
  const propertyId = usePropertyIdParam();

  return useQuery<BookingRow | null>({
    queryKey: bookingDetailQueryKey(bookingId ?? '', propertyId),
    queryFn: async () => {
      if (!bookingId) return null;

      let request = supabase.from('guest_submissions').select('*').eq('id', bookingId);

      if (propertyId) {
        request = request.eq('property_id', propertyId);
      }

      const { data, error } = await request.single();

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
