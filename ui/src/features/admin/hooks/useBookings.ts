/**
 * useBookings — Admin hook for the paginated booking list.
 *
 * Phase 3: calls the `list-bookings` edge function (admin JWT required) which
 * handles server-side check_in_date sorting (converting MM-DD-YYYY → YYYY-MM-DD
 * in the service layer), default COMPLETED hiding, and accurate pagination.
 *
 * Falls back to a direct PostgREST read when the user's session JWT is unavailable
 * (shouldn't happen inside RequireAdmin, but prevents a hard crash during hydration).
 *
 * Plan: docs/NEW_FLOW_PLAN.md §6.1 Q5.1, Q5.2
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import {
  compareBookingsForListSort,
  manilaTodayIso,
  matchesDefaultBookingsListVisibility,
  passesListCheckInDateRangeFilter,
} from '@/features/admin/lib/bookingsListSort';
import type { BookingRow, BookingsQuery } from '@/features/admin/lib/types';

export const BOOKINGS_QUERY_KEY = ['bookings'] as const;

type BookingsResult = {
  rows: BookingRow[];
  total: number;
};

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

const GENERIC_BOOKINGS_ERROR =
  'We could not load bookings. Please try again in a moment.';

async function fetchBookingsFromEdgeFunction(query: BookingsQuery): Promise<BookingsResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) throw new Error('No admin session');

  const params = new URLSearchParams();
  if (query.q.trim()) params.set('q', query.q.trim());
  if (query.status.length > 0) query.status.forEach((s) => params.append('status', s));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.hasPets !== null) params.set('has_pets', String(query.hasPets));
  if (query.needParking !== null) params.set('need_parking', String(query.needParking));
  params.set('sort', query.sort);
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  if (query.showCompletedBookings) {
    params.set('show_completed_bookings', 'true');
  }

  const res = await fetch(`${FUNCTIONS_URL}/list-bookings?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? GENERIC_BOOKINGS_ERROR);
  }

  return { rows: json.data as BookingRow[], total: json.total as number };
}

export function useBookings(query: BookingsQuery) {
  return useQuery<BookingsResult>({
    queryKey: [...BOOKINGS_QUERY_KEY, query] as const,
    queryFn: async () => {
      try {
        return await fetchBookingsFromEdgeFunction(query);
      } catch (err) {
        console.error('[useBookings] Edge function failed, falling back to PostgREST:', err);

        // PostgREST fallback — fetch matches, sort in JS (mirrors list-bookings).
        let request = supabase.from('guest_submissions').select('*');

        if (query.q.trim()) {
          // Mirror the broadened search in `_shared/databaseService.ts#listBookings`.
          // Keep these two field lists in lockstep — diverging hides results
          // intermittently whenever the edge function is unreachable.
          const needle = `%${query.q.trim()}%`;
          request = request.or(
            [
              `guest_facebook_name.ilike.${needle}`,
              `primary_guest_name.ilike.${needle}`,
              `guest_email.ilike.${needle}`,
              `guest_phone_number.ilike.${needle}`,
              `guest_address.ilike.${needle}`,
              `nationality.ilike.${needle}`,
              `guest2_name.ilike.${needle}`,
              `guest3_name.ilike.${needle}`,
              `guest4_name.ilike.${needle}`,
              `guest5_name.ilike.${needle}`,
              `pet_name.ilike.${needle}`,
              `pet_type.ilike.${needle}`,
              `pet_breed.ilike.${needle}`,
              `car_plate_number.ilike.${needle}`,
              `car_brand_model.ilike.${needle}`,
              `car_color.ilike.${needle}`,
              `guest_special_requests.ilike.${needle}`,
              `find_us_details.ilike.${needle}`,
            ].join(','),
          );
        }

        if (query.status.length > 0) {
          request = request.in('status', [...query.status]);
        }

        if (query.hasPets === true) request = request.eq('has_pets', true);
        if (query.hasPets === false) request = request.eq('has_pets', false);
        if (query.needParking === true) request = request.eq('need_parking', true);
        if (query.needParking === false) request = request.eq('need_parking', false);

        request = request.order('created_at', { ascending: false });

        const { data, error } = await request;
        if (error) {
          console.error('[useBookings] PostgREST fallback error', error);
          throw new Error(GENERIC_BOOKINGS_ERROR);
        }

        const today = manilaTodayIso();
        let rows = (data ?? []) as BookingRow[];

        if (query.from || query.to) {
          rows = rows.filter((r) =>
            passesListCheckInDateRangeFilter(r, query.from, query.to),
          );
        }

        rows = rows.filter((r) =>
          matchesDefaultBookingsListVisibility(r, query.showCompletedBookings),
        );

        rows.sort((a, b) =>
          compareBookingsForListSort(a, b, query.sort, today),
        );

        const total = rows.length;
        const fromIdx = (query.page - 1) * query.limit;
        const paged = rows.slice(fromIdx, fromIdx + query.limit);

        return { rows: paged, total };
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
