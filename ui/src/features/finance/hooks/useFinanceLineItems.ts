import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FinanceQuery, RecurrenceEditScope } from '@/features/finance/lib/types';
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
    queryKey: [...FINANCE_LINE_ITEMS_KEY, query.from, query.to, query.q] as const,
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
    onSuccess: (result) => {
      toast.success(
        result.created_count > 1
          ? `${result.created_count} recurring transactions created`
          : 'Transaction saved',
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      patch,
      scope,
    }: {
      id: string;
      patch: Parameters<typeof updateFinanceLineItemApi>[1];
      scope?: RecurrenceEditScope;
    }) => updateFinanceLineItemApi(id, patch, scope),
    onSuccess: (result) => {
      toast.success(
        result.updated_count > 1
          ? `${result.updated_count} transactions updated`
          : 'Transaction updated',
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: ({
      id,
      scope,
    }: {
      id: string;
      scope?: RecurrenceEditScope;
    }) => deleteFinanceLineItemApi(id, scope),
    onSuccess: (result) => {
      toast.success(
        result.deleted_count > 1
          ? `${result.deleted_count} transactions deleted`
          : 'Transaction deleted',
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove };
}
