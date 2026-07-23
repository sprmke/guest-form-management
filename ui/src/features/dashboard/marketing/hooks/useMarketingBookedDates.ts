import { useQuery } from '@tanstack/react-query';

import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { guestBookedDatesUrl } from '@/features/guest/form/lib/guestPropertyScope';
import { normalizeDateString, type BookedDateRange } from '@/utils/format/dates';

const apiUrl = import.meta.env.VITE_API_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const MARKETING_BOOKED_DATES_QUERY_KEY = ['marketing-booked-dates'] as const;

async function fetchMarketingBookedDates(propertySlug: string): Promise<BookedDateRange[]> {
  const url = guestBookedDatesUrl(apiUrl, propertySlug);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });

  const result = (await response.json()) as {
    success?: boolean;
    data?: BookedDateRange[];
    error?: string;
  };

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to load booked dates');
  }

  return result.data.map((booking) => ({
    ...booking,
    checkInDate: normalizeDateString(booking.checkInDate),
    checkOutDate: normalizeDateString(booking.checkOutDate),
  }));
}

export function useMarketingBookedDates() {
  const { propertySlug } = useOrgContext();

  return useQuery({
    queryKey: [...MARKETING_BOOKED_DATES_QUERY_KEY, propertySlug],
    queryFn: () => fetchMarketingBookedDates(propertySlug),
    enabled: Boolean(propertySlug),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  });
}
