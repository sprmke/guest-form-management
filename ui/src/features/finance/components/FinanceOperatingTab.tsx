import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
} from "lucide-react";
import { FinanceOperatingTabSkeleton } from "@/components/skeletons/AdminSkeletons";
import { AdminListMetaBar } from "@/features/admin/components/AdminListToolbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdminDataTable,
  AdminTableHeadRow,
  AdminTableTh,
  adminTableCell,
  adminTableIconButtonClass,
  adminTableMoneyClass,
  adminTableRowClass,
} from "@/features/admin/components/AdminDataTable";
import { formatIsoDate, formatMoney } from "@/features/admin/lib/formatters";
import { FinanceKpiCard } from "@/features/finance/components/FinanceKpiCard";
import {
  OperatingLineItemForm,
  telegramReminderPayloadFromForm,
  type OperatingLineItemFormValues,
} from "@/features/finance/components/OperatingLineItemForm";
import { RecurringDeleteDialog } from "@/features/finance/components/RecurringDeleteDialog";
import { RecurringSeriesModal } from "@/features/finance/components/RecurringSeriesModal";
import { useTelegramFinanceSettings } from "@/features/admin/hooks/useTelegramFinanceSettings";
import { FINANCE_DEFAULT_REMINDER_TEMPLATE } from "@/features/finance/lib/financeReminderTemplate";
import { useFinanceLineItemMutations, useFinanceLineItems } from "@/features/finance/hooks/useFinanceLineItems";
import { recurrenceIntervalLabel } from "@/features/finance/lib/recurrence";
import type {
  FinanceLineItem,
  FinanceQuery,
} from "@/features/finance/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  query: FinanceQuery;
};

export function FinanceOperatingTab({ query }: Props) {
  const { data: items = [], isLoading } = useFinanceLineItems(query);
  const { create, update, remove } = useFinanceLineItemMutations(query);
  const { data: financeSettings } = useTelegramFinanceSettings();
  const globalDefaultMessageTemplate =
    financeSettings?.defaultReminderTemplate ??
    FINANCE_DEFAULT_REMINDER_TEMPLATE;
  const [modalOpen, setModalOpen] = useState(false);
  const [createSession, setCreateSession] = useState(0);
  const [editing, setEditing] = useState<FinanceLineItem | null>(null);
  const [deleting, setDeleting] = useState<FinanceLineItem | null>(null);
  const [seriesAnchor, setSeriesAnchor] = useState<FinanceLineItem | null>(
    null,
  );

  function openCreate() {
    setEditing(null);
    setCreateSession((n) => n + 1);
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

  function openSeries(item: FinanceLineItem) {
    if (!item.recurrence_series_id) return;
    setSeriesAnchor(item);
  }

  function closeSeries() {
    setSeriesAnchor(null);
  }

  function handleSubmit(values: OperatingLineItemFormValues) {
    const payload = {
      kind: values.kind,
      label: values.label.trim(),
      amount: values.amount,
      category: values.category.trim(),
      occurred_on: values.occurred_on,
      notes: values.notes?.trim() || null,
      ...telegramReminderPayloadFromForm(values, globalDefaultMessageTemplate),
    };
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          patch: payload,
          scope: editing.recurrence_series_id ? values.edit_scope : "this",
        },
        { onSuccess: closeModal },
      );
    } else {
      create.mutate(
        {
          ...payload,
          recurrence_interval:
            values.recurrence_interval === "none"
              ? null
              : values.recurrence_interval,
          recurrence_until:
            values.recurrence_interval === "none"
              ? null
              : (values.recurrence_until ?? null),
        },
        { onSuccess: closeModal },
      );
    }
  }

  const incomeTotal = items
    .filter((i) => i.kind === "income")
    .reduce((a, i) => a + i.amount, 0);
  const expenseTotal = items
    .filter((i) => i.kind === "expense")
    .reduce((a, i) => a + i.amount, 0);
  const net = incomeTotal - expenseTotal;

  const hasSearch = query.q.trim().length > 0;
  const showStatusColumn = items.some((item) => item.telegram_reminder_enabled);
  const tableColumnCount = showStatusColumn ? 7 : 6;

  if (isLoading && items.length === 0) {
    return <FinanceOperatingTabSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FinanceKpiCard
          label="Net"
          value={formatMoney(net)}
          icon={CircleDollarSign}
          iconColor={
            net >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }
          valueClassName={cn(
            net >= 0
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-red-600 dark:text-red-400",
          )}
        />
        <FinanceKpiCard
          label="Income"
          value={formatMoney(incomeTotal)}
          icon={ArrowUpRight}
        />
        <FinanceKpiCard
          label="Expenses"
          value={formatMoney(expenseTotal)}
          icon={ArrowDownRight}
        />
      </div>

      <AdminListMetaBar
        summary={{
          total: items.length,
          startIdx: items.length === 0 ? 0 : 1,
          endIdx: items.length,
          entityLabel: items.length === 1 ? "transaction" : "transactions",
          isLoading,
          emptyLabel: hasSearch
            ? "No transactions match your search"
            : "No transactions yet",
        }}
        showPerPage={false}
        actionsSlot={
          <button
            type="button"
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3.5 py-2",
              "gradient-primary text-[13px] font-semibold text-primary-foreground shadow-soft",
              "transition-all duration-200 hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)] motion-safe:active:scale-[0.98]",
            )}
            onClick={openCreate}
          >
            <Plus className="size-4" aria-hidden />
            Add transaction
          </button>
        }
      />

      <AdminDataTable minWidth={showStatusColumn ? 600 : 520}>
        <AdminTableHeadRow>
          <AdminTableTh className="pr-3 pl-4 sm:pl-5">Date</AdminTableTh>
          <AdminTableTh className="px-3 sm:px-4">Type</AdminTableTh>
          <AdminTableTh className="px-3 sm:px-4">Description</AdminTableTh>
          <AdminTableTh className="hidden md:table-cell">Category</AdminTableTh>
          {showStatusColumn ? (
            <AdminTableTh className="hidden md:table-cell">Status</AdminTableTh>
          ) : null}
          <AdminTableTh className="px-3 sm:px-4">Amount</AdminTableTh>
          <AdminTableTh className="pr-3 pl-2 text-left sm:pr-4 sm:pl-3">
            <span className="sr-only">Actions</span>
          </AdminTableTh>
        </AdminTableHeadRow>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={tableColumnCount}>
                <div className="flex flex-col gap-3 justify-center items-center px-4 py-20 text-center">
                  <div className="icon-well-sm bg-muted/80">
                    <Receipt
                      className="size-[18px] text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                  <div>
                    <p className="font-bold text-section-title text-foreground">
                      {hasSearch
                        ? "No transactions match your search"
                        : "No transactions yet"}
                    </p>
                    <p className="mx-auto mt-1 max-w-[280px] text-caption">
                      {hasSearch
                        ? "Try a different keyword or clear the search filter."
                        : "Add rent, utilities, or other property costs to track profit alongside stay revenue."}
                    </p>
                  </div>
                  {!hasSearch ? (
                    <button
                      type="button"
                      className={cn(
                        "mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-4",
                        "gradient-primary text-[13px] font-semibold text-primary-foreground shadow-soft",
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
                <td className={cn("whitespace-nowrap", adminTableCell.status)}>
                  <p className="text-data-primary">
                    {formatIsoDate(item.occurred_on)}
                  </p>
                </td>
                <td className={adminTableCell.body}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      item.kind === "income"
                        ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400",
                    )}
                  >
                    {item.kind === "income" ? (
                      <ArrowUpRight className="size-3" aria-hidden />
                    ) : (
                      <ArrowDownRight className="size-3" aria-hidden />
                    )}
                    {item.kind}
                  </span>
                </td>
                <td className={adminTableCell.body}>
                  {item.recurrence_series_id ? (
                    <button
                      type="button"
                      className="max-w-[220px] text-left transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                      onClick={() => openSeries(item)}
                    >
                      <p className="truncate text-data-primary underline-offset-2 hover:underline">
                        {item.label}
                      </p>
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        <Repeat className="size-3 shrink-0" aria-hidden />
                        {recurrenceIntervalLabel(item.recurrence_interval)}
                      </span>
                    </button>
                  ) : (
                    <p className="max-w-[220px] truncate text-data-primary">
                      {item.label}
                    </p>
                  )}
                  {item.notes ? (
                    <p className="mt-0.5 max-w-[220px] truncate text-data-secondary">
                      {item.notes}
                    </p>
                  ) : null}
                  {showStatusColumn && item.telegram_reminder_enabled ? (
                    <div className="mt-1.5 md:hidden">
                      <TransactionPaymentStatusBadge
                        isPaid={Boolean(item.paid_at)}
                      />
                    </div>
                  ) : null}
                </td>
                <td
                  className={cn(
                    "hidden text-data-secondary md:table-cell",
                    adminTableCell.body,
                  )}
                >
                  {item.category ?? "—"}
                </td>
                {showStatusColumn ? (
                  <td
                    className={cn("hidden md:table-cell", adminTableCell.body)}
                  >
                    {item.telegram_reminder_enabled ? (
                      <TransactionPaymentStatusBadge
                        isPaid={Boolean(item.paid_at)}
                      />
                    ) : (
                      <span className="text-data-secondary">—</span>
                    )}
                  </td>
                ) : null}
                <td className={adminTableCell.money}>
                  <span
                    className={adminTableMoneyClass(
                      item.kind === "income"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {item.kind === "income" ? "+" : "−"}
                    {formatMoney(item.amount)}
                  </span>
                </td>
                <td className={adminTableCell.action}>
                  <div className="flex justify-end gap-0.5">
                    {item.recurrence_series_id ? (
                      <button
                        type="button"
                        className={adminTableIconButtonClass}
                        aria-label="View recurring series"
                        onClick={() => openSeries(item)}
                      >
                        <Repeat className="size-4" />
                      </button>
                    ) : null}
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
                        "hover:bg-destructive/10 hover:text-destructive",
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
          className="max-h-[min(90dvh,44rem)] max-w-[min(calc(100vw-1.5rem),34rem)] overflow-y-auto sm:max-w-[min(calc(100vw-2rem),36rem)] sm:p-5"
          onPointerDownOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest("[data-radix-popper-content-wrapper]")) {
              e.preventDefault();
              return;
            }
            if (create.isPending || update.isPending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (create.isPending || update.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>
              {editing ? "Edit transaction" : "New transaction"}
            </DialogTitle>
          </DialogHeader>
          <OperatingLineItemForm
            key={
              editing
                ? `${editing.id}:${editing.telegram_reminder_interval}`
                : `new-${createSession}`
            }
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            isPending={create.isPending || update.isPending}
          />
        </DialogContent>
      </Dialog>

      <RecurringSeriesModal
        anchor={seriesAnchor}
        open={seriesAnchor != null}
        onClose={closeSeries}
        query={query}
      />

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

function TransactionPaymentStatusBadge({ isPaid }: { isPaid: boolean }) {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-3 shrink-0" aria-hidden />
        Paid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
      <Clock3 className="size-3 shrink-0" aria-hidden />
      Unpaid
    </span>
  );
}
