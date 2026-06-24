import {
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Repeat,
  Trash2,
} from 'lucide-react';
import { CalendarDatePill } from '@/features/admin/components/calendar/CalendarDatePill';
import { DateCalendarView } from '@/features/admin/components/calendar/DateCalendarView';
import { formatMoney, formatMoneyCompact } from '@/features/admin/lib/formatters';
import type { StatusTone } from '@/features/admin/lib/bookingStatus';
import { recurrenceIntervalLabel } from '@/features/finance/lib/recurrence';
import {
  TransactionPaymentStatusBadge,
} from '@/features/finance/components/FinanceTransactionsCardGrid';
import type { FinanceLineItem } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type ItemActions = {
  onEdit: (item: FinanceLineItem) => void;
  onDelete: (item: FinanceLineItem) => void;
  onOpenSeries?: (item: FinanceLineItem) => void;
};

type Props = ItemActions & {
  items: FinanceLineItem[];
  isLoading: boolean;
  error?: string | null;
  isRefreshing?: boolean;
  initialMonth?: Date;
  onMonthChange?: (month: Date) => void;
  showStatus?: boolean;
};

function transactionTone(item: FinanceLineItem): StatusTone {
  if (item.telegram_reminder_enabled && !item.paid_at) return 'yellow';
  return item.kind === 'income' ? 'green' : 'red';
}

export function FinanceTransactionsCalendarView({
  items,
  isLoading,
  error = null,
  isRefreshing,
  initialMonth,
  onMonthChange,
  showStatus = false,
  onEdit,
  onDelete,
  onOpenSeries,
}: Props) {
  return (
    <DateCalendarView
      rows={items}
      isLoading={isLoading}
      error={error}
      isRefreshing={isRefreshing}
      getItemKey={(item) => item.id}
      getItemDate={(item) => item.occurred_on}
      renderPill={(item) => (
        <CalendarDatePill
          tone={transactionTone(item)}
          label={formatMoneyCompact(item.amount)}
          title={`${item.label} · ${item.kind === 'income' ? '+' : '−'}${formatMoney(item.amount)}`}
          labelClassName="tabular-nums"
        />
      )}
      renderDayItem={(item) => (
        <FinanceTransactionDayCard
          item={item}
          showStatus={showStatus}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
          onOpenSeries={onOpenSeries ? () => onOpenSeries(item) : undefined}
        />
      )}
      entityLabel="transactions"
      entityLabelSingular="transaction"
      initialMonth={initialMonth}
      onMonthChange={onMonthChange}
      emptySelectCaption="Click any day to see transactions on that date"
      emptyDayCaption="No transactions on this date"
    />
  );
}

function FinanceTransactionDayCard({
  item,
  showStatus,
  onEdit,
  onDelete,
  onOpenSeries,
}: {
  item: FinanceLineItem;
  showStatus: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenSeries?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <div className="flex items-start justify-between gap-2">
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
        {showStatus && item.telegram_reminder_enabled ? (
          <TransactionPaymentStatusBadge isPaid={Boolean(item.paid_at)} />
        ) : null}
      </div>

      {item.recurrence_series_id && onOpenSeries ? (
        <button
          type="button"
          className="mt-2 max-w-full text-left"
          onClick={onOpenSeries}
        >
          <p className="truncate text-sm font-bold text-foreground underline-offset-2 hover:underline">
            {item.label}
          </p>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Repeat className="size-3 shrink-0" aria-hidden />
            {recurrenceIntervalLabel(item.recurrence_interval)}
          </span>
        </button>
      ) : (
        <p className="mt-2 truncate text-sm font-bold text-foreground">
          {item.label}
        </p>
      )}

      {item.category ? (
        <p className="mt-0.5 truncate text-data-secondary">{item.category}</p>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            item.kind === 'income'
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-600 dark:text-red-400',
          )}
        >
          {item.kind === 'income' ? '+' : '−'}
          {formatMoney(item.amount)}
        </span>
        <div className="flex gap-0.5">
          {item.recurrence_series_id && onOpenSeries ? (
            <DayIconButton label="View series" onClick={onOpenSeries}>
              <Repeat className="size-4" />
            </DayIconButton>
          ) : null}
          <DayIconButton label="Edit" onClick={onEdit}>
            <Pencil className="size-4" />
          </DayIconButton>
          <DayIconButton label="Delete" destructive onClick={onDelete}>
            <Trash2 className="size-4" />
          </DayIconButton>
        </div>
      </div>
    </div>
  );
}

function DayIconButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5',
        'text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground',
        destructive && 'hover:bg-destructive/10 hover:text-destructive',
      )}
    >
      {children}
    </button>
  );
}
