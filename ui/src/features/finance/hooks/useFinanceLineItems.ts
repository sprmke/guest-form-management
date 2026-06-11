import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FinanceQuery, RecurrenceEditScope } from '@/features/finance/lib/types';
import {
  createFinanceLineItemApi,
  deleteFinanceLineItemApi,
  extendRecurringSeriesApi,
  fetchFinanceLineItems,
  fetchRecurringSeriesItems,
  updateFinanceLineItemApi,
} from '@/features/finance/hooks/useFinanceApi';
import { FINANCE_SUMMARY_KEY } from '@/features/finance/hooks/useFinanceSummary';

export const FINANCE_LINE_ITEMS_KEY = ['finance-line-items'] as const;
export const FINANCE_RECURRING_SERIES_KEY = ['finance-recurring-series'] as const;

function financeMutationErrorMessage(error: Error): string {
  switch (error.message) {
    case 'cannot_change_date_on_series_batch':
      return 'Could not update the date for this recurring series. Please try again.';
    case 'extend_until_must_be_after_series_end':
      return 'Choose a date after the last occurrence in the series.';
    case 'extend_until_must_be_before_series_start':
      return 'Choose a date before the first occurrence in the series.';
    default:
      return error.message;
  }
}

export function useFinanceLineItems(query: FinanceQuery) {
  return useQuery({
    queryKey: [...FINANCE_LINE_ITEMS_KEY, query.from, query.to, query.q] as const,
    queryFn: () => fetchFinanceLineItems(query),
    enabled: query.tab === 'transactions' || query.tab === 'overview',
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
    onError: (e: Error) => toast.error(financeMutationErrorMessage(e)),
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
    onError: (e: Error) => toast.error(financeMutationErrorMessage(e)),
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

export function useRecurringSeries(seriesId: string | null) {
  return useQuery({
    queryKey: [...FINANCE_RECURRING_SERIES_KEY, seriesId] as const,
    queryFn: () => fetchRecurringSeriesItems(seriesId!),
    enabled: Boolean(seriesId),
  });
}

export function useRecurringSeriesMutations(seriesId: string | null, _query: FinanceQuery) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: FINANCE_LINE_ITEMS_KEY });
    void qc.invalidateQueries({ queryKey: FINANCE_RECURRING_SERIES_KEY });
    void qc.invalidateQueries({ queryKey: FINANCE_SUMMARY_KEY });
  };

  const extend = useMutation({
    mutationFn: extendRecurringSeriesApi,
    onSuccess: (result) => {
      toast.success(
        result.created_count > 0
          ? `Added ${result.created_count} occurrence${result.created_count === 1 ? '' : 's'}`
          : 'No new occurrences to add',
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(financeMutationErrorMessage(e)),
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
    }) => updateFinanceLineItemApi(id, patch, scope ?? 'this'),
    onSuccess: (result) => {
      toast.success(
        result.updated_count > 1
          ? `${result.updated_count} transactions updated`
          : 'Occurrence updated',
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(financeMutationErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFinanceLineItemApi(id, 'this'),
    onSuccess: () => {
      toast.success('Occurrence deleted');
      invalidate();
    },
    onError: (e: Error) => toast.error(financeMutationErrorMessage(e)),
  });

  return { extend, update, remove, seriesId };
}
