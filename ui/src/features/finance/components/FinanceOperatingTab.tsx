import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import { FinanceOperatingTabSkeleton } from '@/components/skeletons/AdminSkeletons';
import { formatMoney } from '@/features/admin/lib/formatters';
import {
  OperatingLineItemForm,
  type OperatingLineItemFormValues,
} from '@/features/finance/components/OperatingLineItemForm';
import { useFinanceLineItemMutations } from '@/features/finance/hooks/useFinanceLineItems';
import type { FinanceLineItem, FinanceQuery } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  query: FinanceQuery;
  items: FinanceLineItem[];
  isLoading: boolean;
};

export function FinanceOperatingTab({ query, items, isLoading }: Props) {
  const { create, update, remove } = useFinanceLineItemMutations(query);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceLineItem | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: FinanceLineItem) {
    setEditing(item);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSubmit(values: OperatingLineItemFormValues) {
    const payload = {
      kind: values.kind,
      label: values.label.trim(),
      amount: values.amount,
      category: values.category?.trim() || null,
      occurred_on: values.occurred_on,
      notes: values.notes?.trim() || null,
    };
    if (editing) {
      update.mutate(
        { id: editing.id, patch: payload },
        { onSuccess: closeModal },
      );
    } else {
      create.mutate(payload, { onSuccess: closeModal });
    }
  }

  const incomeTotal = items
    .filter((i) => i.kind === 'income')
    .reduce((a, i) => a + i.amount, 0);
  const expenseTotal = items
    .filter((i) => i.kind === 'expense')
    .reduce((a, i) => a + i.amount, 0);
  const net = incomeTotal - expenseTotal;

  if (isLoading && items.length === 0) {
    return <FinanceOperatingTabSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/15">
              <ArrowUpRight className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Income
            </span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {formatMoney(incomeTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-red-500/15">
              <ArrowDownRight className="size-3.5 text-red-600 dark:text-red-400" aria-hidden />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Expenses
            </span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
            {formatMoney(expenseTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-md',
                net >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15',
              )}
            >
              <CircleDollarSign
                className={cn(
                  'size-3.5',
                  net >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400',
                )}
                aria-hidden
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Net
            </span>
          </div>
          <p
            className={cn(
              'mt-2 text-lg font-bold tabular-nums',
              net >= 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {formatMoney(net)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {items.length} line{items.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg gradient-primary px-3 text-xs font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)]"
          onClick={openCreate}
        >
          <Plus className="size-3.5" aria-hidden />
          Add line
        </button>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="bg-muted/40 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="hidden px-4 py-3 md:table-cell">Category</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-separator">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Receipt className="mx-auto size-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No operating lines yet
                  </p>
                  <p className="mx-auto mt-1 max-w-[280px] text-xs text-muted-foreground">
                    Add rent, utilities, or other property costs to track
                    operating profit alongside stay revenue.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg gradient-primary px-4 text-xs font-semibold text-primary-foreground"
                    onClick={openCreate}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Add first line
                  </button>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="group transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                    {item.occurred_on}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        item.kind === 'income'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400',
                      )}
                    >
                      {item.kind === 'income' ? (
                        <ArrowUpRight className="size-3" aria-hidden />
                      ) : (
                        <ArrowDownRight className="size-3" aria-hidden />
                      )}
                      {item.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-[220px] truncate text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    {item.notes && (
                      <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground">
                        {item.notes}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {item.category ?? '—'}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right text-sm tabular-nums font-semibold',
                      item.kind === 'income'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {item.kind === 'income' ? '+' : '−'}
                    {formatMoney(item.amount)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${item.label}"? This cannot be undone.`,
                            )
                          ) {
                            remove.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="operating-form-title"
            className="fixed left-1/2 top-1/2 z-50 max-h-[min(90dvh,36rem)] w-[min(calc(100vw-1.5rem),26rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-elevated-lg"
          >
            <h2
              id="operating-form-title"
              className="mb-4 text-base font-bold text-foreground"
            >
              {editing ? 'Edit line item' : 'New line item'}
            </h2>
            <OperatingLineItemForm
              initial={editing}
              onSubmit={handleSubmit}
              onCancel={closeModal}
              isPending={create.isPending || update.isPending}
            />
          </div>
        </>
      )}
    </div>
  );
}
