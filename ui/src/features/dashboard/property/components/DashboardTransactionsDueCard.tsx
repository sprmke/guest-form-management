import { formatMoney } from '@/utils/format/currency';
import { formatIsoDate } from '@/utils/format/bookingDisplay';
import { useMemo } from 'react';

import { Link } from 'react-router-dom';

import { ArrowRight, CalendarClock, CheckCircle2, Receipt, Repeat } from 'lucide-react';

import {
  buildDashboardTransactionRows,
  countDashboardDueInPeriod,
  countDashboardRecurringInPeriod,
  dashboardTransactionMaxRows,
} from '@/features/dashboard/property/lib/dashboardFinanceTransactions';
import type { FinanceLineItem } from '@/features/dashboard/finance/lib/types';

import { Skeleton } from '@/components/ui/skeleton';
import type { DatePreset } from '@/lib/date/navigation';
import { cn } from '@/lib/utils';

type Props = {
  items: FinanceLineItem[];
  from: string;
  to: string;
  rangeLabel: string;
  datePreset: DatePreset;
  /** Match calendar card height on desktop (from ResizeObserver). */
  syncedHeight?: number;
  isLoading?: boolean;
  isRefreshing?: boolean;
  className?: string;
};

export function DashboardTransactionsDueCard({
  items,
  from,
  to,
  rangeLabel,
  datePreset,
  syncedHeight,
  isLoading,
  isRefreshing,
  className,
}: Props) {
  const maxRows = dashboardTransactionMaxRows(datePreset);
  const rows = useMemo(() => buildDashboardTransactionRows(items, from, to), [items, from, to]);
  const dueCount = useMemo(() => countDashboardDueInPeriod(items, from, to), [items, from, to]);
  const recurringCount = useMemo(
    () => countDashboardRecurringInPeriod(items, from, to),
    [items, from, to]
  );
  const visibleRows = rows.slice(0, maxRows);
  const transactionsHref = `/finance?from=${from}&to=${to}`;

  return (
    <section
      className={cn(
        'surface-card flex min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4',
        className
      )}
      style={syncedHeight ? { height: syncedHeight } : undefined}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <div className="icon-well-sm bg-muted/80 shrink-0">
            <Receipt className="text-muted-foreground size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-foreground text-lg font-semibold tracking-tight">Transactions</p>
            <p className="text-muted-foreground text-xs">Due dates & recurring · {rangeLabel}</p>
          </div>
        </div>
      </div>

      {!isLoading ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <CalendarClock className="size-3 shrink-0" aria-hidden />
            {dueCount} due
          </span>
          <span className="border-border/60 bg-muted/40 text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold">
            <Repeat className="text-muted-foreground size-3 shrink-0" aria-hidden />
            {recurringCount} recurring
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col transition-opacity duration-300',
          isRefreshing && !isLoading && 'opacity-60'
        )}
      >
        {isLoading ? (
          <div
            className="min-h-0 flex-1 space-y-2"
            aria-busy="true"
            aria-label="Loading transactions"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="border-border/60 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
            <CalendarClock className="text-muted-foreground/70 size-8" aria-hidden />
            <p className="text-foreground text-sm font-semibold">Nothing due in this period</p>
            <p className="text-caption max-w-xs">
              Recurring bills and payment due dates for {rangeLabel} will show here.
            </p>
          </div>
        ) : (
          <>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
              {visibleRows.map((row) => (
                <li key={row.item.id}>
                  <TransactionRow row={row} />
                </li>
              ))}
            </ul>

            {rows.length > maxRows ? (
              <Link
                to={transactionsHref}
                className="border-border/60 bg-muted/30 text-primary hover:bg-primary/10 mt-3 flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                View all
                <span className="text-muted-foreground font-medium">
                  (+{rows.length - maxRows} more)
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function TransactionRow({
  row,
}: {
  row: ReturnType<typeof buildDashboardTransactionRows>[number];
}) {
  const { item, dueDate, isRecurring, recurrenceLabel, isOverdue, isDueToday, isPaid } = row;

  return (
    <div className="border-border/50 bg-muted/20 rounded-xl border px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-semibold">{item.label}</p>
          {item.category ? <p className="text-caption mt-0.5 truncate">{item.category}</p> : null}
        </div>
        <p
          className={cn(
            'shrink-0 text-sm font-bold tabular-nums',
            item.kind === 'income'
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-600 dark:text-red-400'
          )}
        >
          {item.kind === 'income' ? '+' : '−'}
          {formatMoney(item.amount)}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-medium">
          <CalendarClock className="size-3 shrink-0" aria-hidden />
          Due {formatIsoDate(dueDate)}
        </span>

        {isRecurring && recurrenceLabel ? (
          <span className="border-border/50 bg-card text-muted-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            <Repeat className="size-3 shrink-0" aria-hidden />
            {recurrenceLabel}
          </span>
        ) : null}

        {isPaid ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3 shrink-0" aria-hidden />
            Paid
          </span>
        ) : isOverdue ? (
          <span className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
            Overdue
          </span>
        ) : isDueToday ? (
          <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
            Due today
          </span>
        ) : null}
      </div>
    </div>
  );
}
