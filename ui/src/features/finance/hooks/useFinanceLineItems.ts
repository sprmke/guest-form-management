import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FinanceQuery } from '@/features/finance/lib/types';
import {
  createFinanceLineItemApi,
  deleteFinanceLineItemApi,
  fetchFinanceLineItems,
  updateFinanceLineItemApi,
} from '@/features/finance/hooks/useFinanceApi';
import { FINANCE_SUMMARY_KEY } from '@/features/finance/hooks/useFinanceSummary';

export const FINANCE_LINE_ITEMS_KEY = ['finance-line-items'] as const;

export function useFinanceLineItems(query: FinanceQuery) {
  return useQuery({
    queryKey: [...FINANCE_LINE_ITEMS_KEY, query.from, query.to] as const,
    queryFn: () => fetchFinanceLineItems(query),
    enabled: query.tab === 'operating' || query.tab === 'overview',
  });
}

export function useFinanceLineItemMutations(_query: FinanceQuery) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: FINANCE_LINE_ITEMS_KEY });
    void qc.invalidateQueries({ queryKey: FINANCE_SUMMARY_KEY });
  };

  const create = useMutation({
    mutationFn: createFinanceLineItemApi,
    onSuccess: () => {
      toast.success('Line item saved');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof updateFinanceLineItemApi>[1];
    }) => updateFinanceLineItemApi(id, patch),
    onSuccess: () => {
      toast.success('Line item updated');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteFinanceLineItemApi,
    onSuccess: () => {
      toast.success('Line item deleted');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove };
}
