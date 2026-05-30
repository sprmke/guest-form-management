import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { FinanceQuery } from '@/features/finance/lib/types';
import { fetchFinanceSummary } from '@/features/finance/hooks/useFinanceApi';

export const FINANCE_SUMMARY_KEY = ['finance-summary'] as const;

export function useFinanceSummary(query: FinanceQuery) {
  return useQuery({
    queryKey: [...FINANCE_SUMMARY_KEY, query] as const,
    queryFn: () => fetchFinanceSummary(query),
    placeholderData: keepPreviousData,
  });
}
