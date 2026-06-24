import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Pencil,
  Repeat,
  Trash2,
} from 'lucide-react';
import { FinanceStaysCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { formatIsoDate, formatMoney } from '@/features/admin/lib/formatters';
import { recurrenceIntervalLabel } from '@/features/finance/lib/recurrence';
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
  isRefreshing?: boolean;
  showStatus?: boolean;
};

export function FinanceTransactionsCardGrid({
  items,
  isLoading,
  isRefreshing = false,
  showStatus = false,
  onEdit,
  onDelete,
  onOpenSeries,
}: Props) {
  if (isLoading) return <FinanceStaysCardGridSkeleton />;

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
        'transition-opacity duration-300',
        isRefreshing && 'opacity-60',
      )}
    >
      {items.map((item) => (
        <FinanceTransactionCard
          key={item.id}
          item={item}
          showStatus={showStatus}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
          onOpenSeries={onOpenSeries ? () => onOpenSeries(item) : undefined}
        />
      ))}
    </div>
  );
}

function FinanceTransactionCard({
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
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={handleKey}
      aria-label={`Edit transaction ${item.label}`}
      className={cn(
        'cursor-pointer rounded-xl border border-border/50 bg-card p-3.5 transition-all duration-200 sm:p-4',
        'hover:-translate-y-0.5 hover:border-border outline-none',
        'focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
      )}
    >
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
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          {formatIsoDate(item.occurred_on)}
        </span>
      </div>

      {item.recurrence_series_id && onOpenSeries ? (
        <button
          type="button"
          className="mt-2 max-w-full text-left"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSeries();
          }}
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
        <p className="mt-1 truncate text-data-secondary">{item.category}</p>
      ) : null}

      {showStatus && item.telegram_reminder_enabled ? (
        <div className="mt-2">
          <TransactionPaymentStatusBadge isPaid={Boolean(item.paid_at)} />
        </div>
      ) : null}

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-separator pt-3">
        <span
          className={cn(
            'text-base font-bold tabular-nums',
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
            <IconAction
              label="View recurring series"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSeries();
              }}
            >
              <Repeat className="size-4" />
            </IconAction>
          ) : null}
          <IconAction
            label="Edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="size-4" />
          </IconAction>
          <IconAction
            label="Delete"
            destructive
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="size-4" />
          </IconAction>
        </div>
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
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

export function TransactionPaymentStatusBadge({ isPaid }: { isPaid: boolean }) {
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
