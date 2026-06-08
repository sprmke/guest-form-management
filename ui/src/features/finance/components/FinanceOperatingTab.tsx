import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
} from 'lucide-react';
import { FinanceOperatingTabSkeleton } from '@/components/skeletons/AdminSkeletons';
import { AdminListMetaBar } from '@/features/admin/components/AdminListToolbar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AdminDataTable,
  AdminTableHeadRow,
  AdminTableTh,
  adminTableCell,
  adminTableIconButtonClass,
  adminTableMoneyClass,
  adminTableRowClass,
} from '@/features/admin/components/AdminDataTable';
import { formatIsoDate, formatMoney } from '@/features/admin/lib/formatters';
import { FinanceKpiCard } from '@/features/finance/components/FinanceKpiCard';
import {
  OperatingLineItemForm,
  type OperatingLineItemFormValues,
} from '@/features/finance/components/OperatingLineItemForm';
import { RecurringDeleteDialog } from '@/features/finance/components/RecurringDeleteDialog';
import { useFinanceLineItemMutations } from '@/features/finance/hooks/useFinanceLineItems';
import { recurrenceIntervalLabel } from '@/features/finance/lib/recurrence';
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
  const [deleting, setDeleting] = useState<FinanceLineItem | null>(null);

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
        {
          id: editing.id,
          patch: payload,
          scope: editing.recurrence_series_id ? values.edit_scope : 'this',
        },
        { onSuccess: closeModal },
      );
    } else {
      create.mutate(
        {
          ...payload,
          recurrence_interval:
            values.recurrence_interval === 'none'
              ? null
              : values.recurrence_interval,
          recurrence_until:
            values.recurrence_interval === 'none'
              ? null
              : values.recurrence_until ?? null,
        },
        { onSuccess: closeModal },
      );
    }
  }

  const incomeTotal = items
    .filter((i) => i.kind === 'income')
    .reduce((a, i) => a + i.amount, 0);
  const expenseTotal = items
    .filter((i) => i.kind === 'expense')
    .reduce((a, i) => a + i.amount, 0);
  const net = incomeTotal - expenseTotal;

  const hasSearch = query.q.trim().length > 0;

  if (isLoading && items.length === 0) {
    return <FinanceOperatingTabSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FinanceKpiCard
          label="Income"
          value={formatMoney(incomeTotal)}
          icon={ArrowUpRight}
          iconColor="text-emerald-600 dark:text-emerald-400"
          valueClassName="text-emerald-700 dark:text-emerald-300"
        />
        <FinanceKpiCard
          label="Expenses"
          value={formatMoney(expenseTotal)}
          icon={ArrowDownRight}
          iconColor="text-red-600 dark:text-red-400"
          valueClassName="text-red-600 dark:text-red-400"
        />
        <FinanceKpiCard
          label="Net"
          value={formatMoney(net)}
          icon={CircleDollarSign}
          iconColor={
            net >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }
          valueClassName={cn(
            net >= 0
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-600 dark:text-red-400',
          )}
        />
      </div>

      <AdminListMetaBar
        summary={{
          total: items.length,
          startIdx: items.length === 0 ? 0 : 1,
          endIdx: items.length,
          entityLabel: items.length === 1 ? 'transaction' : 'transactions',
          isLoading,
          emptyLabel: hasSearch
            ? 'No transactions match your search'
            : 'No operating transactions yet',
        }}
        showPerPage={false}
        actionsSlot={
          <button
            type="button"
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3.5 py-2',
              'gradient-primary text-[13px] font-semibold text-primary-foreground shadow-soft',
              'transition-all duration-200 hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)] motion-safe:active:scale-[0.98]',
            )}
            onClick={openCreate}
          >
            <Plus className="size-4" aria-hidden />
            Add transaction
          </button>
        }
      />

      <AdminDataTable minWidth={520}>
        <AdminTableHeadRow>
          <AdminTableTh className="pr-3 pl-4 sm:pl-5">Date</AdminTableTh>
          <AdminTableTh className="px-3 sm:px-4">Type</AdminTableTh>
          <AdminTableTh className="px-3 sm:px-4">Description</AdminTableTh>
          <AdminTableTh className="hidden md:table-cell">Category</AdminTableTh>
          <AdminTableTh className="text-right">Amount</AdminTableTh>
          <AdminTableTh className="pr-3 pl-2 text-right sm:pr-4 sm:pl-3">
            <span className="sr-only">Actions</span>
          </AdminTableTh>
        </AdminTableHeadRow>
        <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
                      <div className="icon-well-sm bg-muted/80">
                        <Receipt
                          className="size-[18px] text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                      <div>
                        <p className="text-section-title font-bold text-foreground">
                          {hasSearch
                            ? 'No transactions match your search'
                            : 'No operating transactions yet'}
                        </p>
                        <p className="mx-auto mt-1 max-w-[280px] text-caption">
                          {hasSearch
                            ? 'Try a different keyword or clear the search filter.'
                            : 'Add rent, utilities, or other property costs to track operating profit alongside stay revenue.'}
                        </p>
                      </div>
                      {!hasSearch ? (
                        <button
                          type="button"
                          className={cn(
                            'mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-4',
                            'gradient-primary text-[13px] font-semibold text-primary-foreground shadow-soft',
                          )}
                          onClick={openCreate}
                        >
                          <Plus className="size-4" aria-hidden />
                          Add first transaction
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={adminTableRowClass(index, { interactive: false })}
                  >
                    <td
                      className={cn(
                        'whitespace-nowrap',
                        adminTableCell.status,
                      )}
                    >
                      <p className="text-data-primary">
                        {formatIsoDate(item.occurred_on)}
                      </p>
                    </td>
                    <td className={adminTableCell.body}>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
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
                    <td className={adminTableCell.body}>
                      <p className="max-w-[220px] truncate text-data-primary">
                        {item.label}
                      </p>
                      {item.recurrence_series_id ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          <Repeat className="size-3 shrink-0" aria-hidden />
                          {recurrenceIntervalLabel(item.recurrence_interval)}
                        </span>
                      ) : null}
                      {item.notes ? (
                        <p className="mt-0.5 max-w-[220px] truncate text-data-secondary">
                          {item.notes}
                        </p>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        'hidden text-data-secondary md:table-cell',
                        adminTableCell.body,
                      )}
                    >
                      {item.category ?? '—'}
                    </td>
                    <td className={adminTableCell.money}>
                      <span
                        className={adminTableMoneyClass(
                          item.kind === 'income'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-red-600 dark:text-red-400',
                        )}
                      >
                        {item.kind === 'income' ? '+' : '−'}
                        {formatMoney(item.amount)}
                      </span>
                    </td>
                    <td className={adminTableCell.action}>
                      <div className="flex justify-end gap-0.5">
                        <button
                          type="button"
                          className={adminTableIconButtonClass}
                          aria-label="Edit"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            adminTableIconButtonClass,
                            'hover:bg-destructive/10 hover:text-destructive',
                          )}
                          aria-label="Delete"
                          onClick={() => setDeleting(item)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
        </tbody>
      </AdminDataTable>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent
          className="max-h-[min(90dvh,40rem)] max-w-[min(calc(100vw-1.5rem),28rem)] sm:p-5"
          onPointerDownOutside={(e) => {
            if (create.isPending || update.isPending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (create.isPending || update.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>
              {editing ? 'Edit transaction' : 'New transaction'}
            </DialogTitle>
          </DialogHeader>
          <OperatingLineItemForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            isPending={create.isPending || update.isPending}
          />
        </DialogContent>
      </Dialog>

      <RecurringDeleteDialog
        item={deleting}
        open={deleting != null}
        onClose={() => setDeleting(null)}
        isPending={remove.isPending}
        onConfirm={(scope) => {
          if (!deleting) return;
          remove.mutate(
            { id: deleting.id, scope },
            { onSuccess: () => setDeleting(null) },
          );
        }}
      />
    </div>
  );
}
