import { formatMoney } from '@/utils/format/currency';
import { formatIsoDate } from '@/utils/format/bookingDisplay';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarPlus,
  CalendarRange,
  Hash,
  Loader2,
  Pencil,
  Repeat,
  Tag,
  Trash2,
} from 'lucide-react';

import {
  AdminDataTable,
  AdminTableHeadRow,
  AdminTableTh,
  adminTableCell,
  adminTableIconButtonClass,
  adminTableMoneyClass,
  adminTableRowClass,
} from '@/features/dashboard/bookings/components/AdminDataTable';
import { useTelegramFinanceSettings } from '@/features/dashboard/bookings/hooks/useTelegramFinanceSettings';

import {
  OperatingLineItemForm,
  telegramReminderPayloadFromForm,
  type OperatingLineItemFormValues,
} from '@/features/dashboard/finance/components/OperatingLineItemForm';
import { RecurringDeleteDialog } from '@/features/dashboard/finance/components/RecurringDeleteDialog';
import {
  useRecurringSeries,
  useRecurringSeriesMutations,
} from '@/features/dashboard/finance/hooks/useFinanceLineItems';
import { FINANCE_DEFAULT_REMINDER_TEMPLATE } from '@/features/dashboard/finance/lib/financeReminderTemplate';
import {
  recurrenceIntervalLabel,
  recurrenceScheduleUpdateFields,
  suggestExtendAfter,
  suggestExtendBefore,
} from '@/features/dashboard/finance/lib/recurrence';
import type { FinanceLineItem, FinanceQuery } from '@/features/dashboard/finance/lib/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IsoDateInput } from '@/components/ui/iso-date-input';
import { cn } from '@/lib/utils';
import { formatIsoDateForDisplay } from '@/utils/format/dates';

type Props = {
  anchor: FinanceLineItem | null;
  open: boolean;
  onClose: () => void;
  query: FinanceQuery;
};

export function RecurringSeriesModal({ anchor, open, onClose, query }: Props) {
  const seriesId = anchor?.recurrence_series_id ?? null;
  const { data: items = [], isLoading, isFetching } = useRecurringSeries(open ? seriesId : null);
  const { extend, update, remove } = useRecurringSeriesMutations(seriesId, query);
  const { data: financeSettings } = useTelegramFinanceSettings();
  const globalDefaultMessageTemplate =
    financeSettings?.defaultReminderTemplate ?? FINANCE_DEFAULT_REMINDER_TEMPLATE;

  const [extendBeforeUntil, setExtendBeforeUntil] = useState('');
  const [extendAfterUntil, setExtendAfterUntil] = useState('');
  const [editing, setEditing] = useState<FinanceLineItem | null>(null);
  const [deleting, setDeleting] = useState<FinanceLineItem | null>(null);

  const interval = anchor?.recurrence_interval ?? items[0]?.recurrence_interval ?? null;
  const seriesStart = items[0]?.occurred_on;
  const seriesEnd = items[items.length - 1]?.occurred_on;

  useEffect(() => {
    if (!open || !interval || !seriesStart || !seriesEnd) return;
    setExtendBeforeUntil(suggestExtendBefore(seriesStart, interval));
    setExtendAfterUntil(suggestExtendAfter(seriesEnd, interval, seriesStart));
  }, [open, interval, seriesStart, seriesEnd]);

  const summary = useMemo(() => {
    if (!anchor || items.length === 0) return null;
    const template = items[0];
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const amountsVary = items.some((item) => item.amount !== template.amount);
    return {
      label: template.label,
      kind: template.kind,
      category: template.category,
      defaultAmount: template.amount,
      totalAmount,
      amountsVary,
    };
  }, [anchor, items]);

  function handleEditSubmit(values: OperatingLineItemFormValues) {
    if (!editing) return;
    const schedule = recurrenceScheduleUpdateFields({
      hasSeries: true,
      recurrenceInterval: values.recurrence_interval,
      recurrenceUntil: values.recurrence_until,
      initialInterval: editing.recurrence_interval,
      initialUntil: seriesEnd,
      editScope: values.edit_scope,
    });
    update.mutate(
      {
        id: editing.id,
        patch: {
          kind: values.kind,
          label: values.label.trim(),
          amount: values.amount,
          category: values.category.trim(),
          occurred_on: values.occurred_on,
          notes: values.notes?.trim() || null,
          ...telegramReminderPayloadFromForm(values, globalDefaultMessageTemplate),
          ...(schedule.recurrence_interval !== undefined
            ? {
                recurrence_interval: schedule.recurrence_interval,
                recurrence_until: schedule.recurrence_until ?? null,
              }
            : {}),
        },
        scope: schedule.scope,
      },
      { onSuccess: () => setEditing(null) }
    );
  }

  const busy = extend.isPending || update.isPending || remove.isPending || isFetching;

  if (!anchor?.recurrence_series_id) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !busy) onClose();
        }}
      >
        <DialogContent
          className="lg:max-w-[min(calc(100vw-3rem),56rem)])] flex max-h-[min(90dvh,44rem)] w-full max-w-[min(calc(100vw-1.5rem),36rem)] flex-col gap-0 overflow-hidden p-0 pb-0 pt-0 sm:max-w-[min(90vw,42rem)] sm:p-0 md:max-w-[min(90vw,48rem)] lg:max-h-[min(90dvh,52rem)]"
          onPointerDownOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
              return;
            }
            if (busy) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <div className="border-border/60 shrink-0 space-y-3.5 border-b px-4 pb-3.5 pt-[max(env(safe-area-inset-top,0px),0.875rem)] sm:px-5 sm:pb-4">
            <DialogHeader className="space-y-2.5 pr-0 text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-12 sm:pr-14">
                <span>{summary?.label ?? anchor.label}</span>
                {interval ? (
                  <span className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1">
                    <Repeat className="size-3" aria-hidden />
                    {recurrenceIntervalLabel(interval)}
                  </span>
                ) : null}
              </DialogTitle>

              {summary && seriesStart && seriesEnd ? (
                <SeriesSummaryGrid
                  category={summary.category}
                  kind={summary.kind}
                  defaultAmount={summary.defaultAmount}
                  totalAmount={summary.totalAmount}
                  amountsVary={summary.amountsVary}
                  count={items.length}
                  seriesStart={seriesStart}
                  seriesEnd={seriesEnd}
                />
              ) : isLoading ? (
                <div className="bg-muted/50 h-24 animate-pulse rounded-xl" />
              ) : null}
            </DialogHeader>

            {interval && seriesStart && seriesEnd ? (
              <div className="space-y-2">
                <p className="text-overline">Extend series</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ExtendPanel
                    label="Add earlier occurrences"
                    description={`Before ${formatIsoDateForDisplay(seriesStart)}`}
                    date={extendBeforeUntil}
                    onDateChange={setExtendBeforeUntil}
                    max={seriesStart}
                    disabled={busy}
                    pending={extend.isPending}
                    onExtend={() => {
                      if (!seriesId || extendBeforeUntil >= seriesStart) return;
                      extend.mutate({
                        recurrence_series_id: seriesId,
                        direction: 'before',
                        extend_until: extendBeforeUntil,
                      });
                    }}
                  />
                  <ExtendPanel
                    label="Add later occurrences"
                    description={`After ${formatIsoDateForDisplay(seriesEnd)}`}
                    date={extendAfterUntil}
                    onDateChange={setExtendAfterUntil}
                    min={seriesEnd}
                    disabled={busy}
                    pending={extend.isPending}
                    onExtend={() => {
                      if (!seriesId || extendAfterUntil <= seriesEnd) return;
                      extend.mutate({
                        recurrence_series_id: seriesId,
                        direction: 'after',
                        extend_until: extendAfterUntil,
                      });
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-3 pb-[max(env(safe-area-inset-bottom,0px),0.875rem)] sm:px-5">
            {!isLoading && items.length > 0 ? (
              <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
                <p className="text-overline">Occurrences</p>
                <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums">
                  {items.length} total
                </span>
              </div>
            ) : null}
            {isLoading ? (
              <div className="text-muted-foreground flex flex-1 items-center justify-center py-10 text-sm">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Loading series…
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground flex flex-1 items-center justify-center py-8 text-center text-sm">
                No occurrences found in this series.
              </p>
            ) : (
              <AdminDataTable minWidth={520} stickyHeader className="min-h-0 flex-1">
                <AdminTableHeadRow sticky>
                  <AdminTableTh className="pl-2 pr-3 sm:pl-3">Date</AdminTableTh>
                  <AdminTableTh className="px-2 sm:px-3">Amount</AdminTableTh>
                  <AdminTableTh className="hidden px-2 sm:table-cell sm:px-3 lg:max-w-none lg:whitespace-normal">
                    Notes
                  </AdminTableTh>
                  <AdminTableTh className="pl-2 pr-2 text-right sm:pr-3">
                    <span className="sr-only">Actions</span>
                  </AdminTableTh>
                </AdminTableHeadRow>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={adminTableRowClass(index, {
                        interactive: false,
                      })}
                    >
                      <td className={cn('whitespace-nowrap', adminTableCell.status)}>
                        <p className="text-data-primary">{formatIsoDate(item.occurred_on)}</p>
                        {item.id === anchor.id ? (
                          <span className="bg-primary/10 text-primary mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                            Opened from list
                          </span>
                        ) : null}
                      </td>
                      <td className={adminTableCell.money}>
                        <span
                          className={adminTableMoneyClass(
                            item.kind === 'income'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {item.kind === 'income' ? '+' : '−'}
                          {formatMoney(item.amount)}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'text-data-secondary hidden max-w-[140px] truncate sm:table-cell lg:max-w-[280px]',
                          adminTableCell.body
                        )}
                      >
                        {item.notes ?? '—'}
                      </td>
                      <td className={adminTableCell.action}>
                        <div className="flex justify-end gap-0.5">
                          <button
                            type="button"
                            className={adminTableIconButtonClass}
                            aria-label={`Edit ${formatIsoDate(item.occurred_on)}`}
                            onClick={() => setEditing(item)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={cn(
                              adminTableIconButtonClass,
                              'hover:bg-destructive/10 hover:text-destructive'
                            )}
                            aria-label={`Delete ${formatIsoDate(item.occurred_on)}`}
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminDataTable>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing != null}
        onOpenChange={(next) => {
          if (!next && !update.isPending) setEditing(null);
        }}
      >
        <DialogContent
          className="max-h-[min(90dvh,44rem)] max-w-[min(calc(100vw-1.5rem),34rem)] overflow-y-auto sm:max-w-[min(calc(100vw-2rem),36rem)] sm:p-5"
          onPointerDownOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
              return;
            }
            if (update.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>Edit occurrence</DialogTitle>
          </DialogHeader>
          {editing ? (
            <OperatingLineItemForm
              key={`${editing.id}:${editing.telegram_reminder_interval}`}
              initial={editing}
              seriesRecurrenceUntil={seriesEnd}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditing(null)}
              isPending={update.isPending}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <RecurringDeleteDialog
        item={deleting}
        open={deleting != null}
        onClose={() => setDeleting(null)}
        isPending={remove.isPending}
        singleOccurrenceOnly
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </>
  );
}

function SeriesSummaryGrid({
  category,
  kind,
  defaultAmount,
  totalAmount,
  amountsVary,
  count,
  seriesStart,
  seriesEnd,
}: {
  category: string | null;
  kind: 'expense' | 'income';
  defaultAmount: number;
  totalAmount: number;
  amountsVary: boolean;
  count: number;
  seriesStart: string;
  seriesEnd: string;
}) {
  const isIncome = kind === 'income';
  const moneyClass = isIncome
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryStat icon={Tag} label="Category" value={category ?? '—'} />
        <SummaryStat
          icon={isIncome ? ArrowUpRight : ArrowDownRight}
          label="Type"
          value={
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                isIncome
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              )}
            >
              {kind}
            </span>
          }
        />
        <SummaryStat
          label={amountsVary ? 'Typical amount' : 'Amount'}
          value={
            <span className={cn('tabular-nums', moneyClass)}>
              {isIncome ? '+' : '−'}
              {formatMoney(defaultAmount)}
            </span>
          }
        />
        <SummaryStat icon={Hash} label="Occurrences" value={String(count)} />
      </div>

      <div className="border-border/50 bg-muted/30 flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="bg-background/80 flex size-9 shrink-0 items-center justify-center rounded-lg">
            <CalendarRange className="text-primary size-[18px]" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-overline">Date range</p>
            <p className="text-foreground mt-0.5 text-sm font-semibold">
              {formatIsoDate(seriesStart)}
              <span className="text-muted-foreground mx-1.5 font-normal">→</span>
              {formatIsoDate(seriesEnd)}
            </p>
          </div>
        </div>
        <div className="shrink-0 sm:pl-4 sm:text-right">
          <p className="text-overline">{amountsVary ? 'Series total' : 'Total value'}</p>
          <p className={cn('mt-0.5 text-sm font-bold tabular-nums sm:text-base', moneyClass)}>
            {isIncome ? '+' : '−'}
            {formatMoney(totalAmount)}
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Tag;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border-border/50 bg-card rounded-xl border p-2.5">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden /> : null}
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          {label}
        </p>
      </div>
      <div className="text-foreground mt-1.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function ExtendPanel({
  label,
  description,
  date,
  onDateChange,
  min,
  max,
  disabled,
  pending,
  onExtend,
}: {
  label: string;
  description: string;
  date: string;
  onDateChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  pending?: boolean;
  onExtend: () => void;
}) {
  return (
    <div className="border-border/50 bg-card rounded-xl border p-3">
      <div className="mb-2.5 flex items-start gap-2.5">
        <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <CalendarPlus className="text-primary size-[18px]" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-xs font-semibold">{label}</p>
          <p className="text-caption text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <IsoDateInput
          value={date}
          min={min}
          max={max}
          disabled={disabled}
          className="min-w-0 flex-1"
          onChange={(e) => onDateChange(e.target.value)}
        />
        <button
          type="button"
          disabled={disabled || !date || pending}
          className="gradient-primary text-primary-foreground shadow-soft inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold disabled:opacity-50 sm:w-auto sm:min-w-[5.5rem]"
          onClick={onExtend}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Add
        </button>
      </div>
    </div>
  );
}
