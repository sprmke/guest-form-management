import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { BookingRow, BookingsQuery } from '@/features/admin/lib/types';

/**
 * Phase 1 reads `guest_submissions` directly via the Supabase JS client. Read access
 * is allowed by the existing RLS policy `Allow public to read guest submissions` added
 * in `20250213044809_add_rls_policies.sql`. Phase 3 will swap this over to the
 * `list-bookings` admin edge function, which does server-side date-aware sorting and
 * enforces the server allow list via `verifyAdminJwt`.
 *
 * Known Phase 1 limitation: check_in_date is stored as `MM-DD-YYYY` TEXT, so a
 * direct DB sort by that column is lexicographic (wrong for year boundaries). We
 * therefore sort by `created_at` only at this layer and expose an optional client-side
 * re-sort on the current page in the list page when the admin asks for "upcoming first".
 */
export const BOOKINGS_QUERY_KEY = ['bookings'] as const;

type BookingsResult = {
  rows: BookingRow[];
  total: number;
};

const SELECT_COLUMNS = '*';

export function useBookings(query: BookingsQuery) {
  return useQuery<BookingsResult>({
    queryKey: [...BOOKINGS_QUERY_KEY, query] as const,
    queryFn: async () => {
      const from = (query.page - 1) * query.limit;
      const to = from + query.limit - 1;

      let request = supabase
        .from('guest_submissions')
        .select(SELECT_COLUMNS, { count: 'exact' });

      // --- Filters ---
      if (query.q.trim()) {
        const needle = `%${query.q.trim()}%`;
        // Search across the common identifier columns. guest_email is cheap and almost
        // always unique enough to find the row.
        request = request.or(
          [
            `guest_facebook_name.ilike.${needle}`,
            `primary_guest_name.ilike.${needle}`,
            `guest_email.ilike.${needle}`,
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

      // `is_test_booking` lands in Phase 0 migration. Defensive: if the column doesn't
      // exist yet on the target DB, Supabase returns 400 — we catch at the caller layer.
      if (!query.includeTests) {
        // Avoid `is.false` for nullability: treat both NULL and FALSE as non-test.
        request = request.or('is_test_booking.is.null,is_test_booking.eq.false');
      }

      // --- Sort ---
      const [sortColumn, sortDirection] = query.sort.split(':') as [
        'created_at',
        'asc' | 'desc',
      ];
      request = request.order(sortColumn, { ascending: sortDirection === 'asc' });

      // --- Pagination ---
      request = request.range(from, to);

      const { data, error, count } = await request;
      if (error) {
        throw new Error(error.message);
      }

      return {
        rows: (data ?? []) as BookingRow[],
        total: count ?? 0,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
