import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { FinanceQuery } from '@/features/finance/lib/types';
import { fetchFinanceBookings } from '@/features/finance/hooks/useFinanceApi';

export const FINANCE_BOOKINGS_KEY = ['finance-bookings'] as const;

export function useFinanceBookings(query: FinanceQuery) {
  return useQuery({
    queryKey: [...FINANCE_BOOKINGS_KEY, query] as const,
    queryFn: () => fetchFinanceBookings(query),
    placeholderData: keepPreviousData,
    enabled: query.tab === 'stays' || query.tab === 'overview',
  });
}
