import { useState } from 'react';

import { format, parseISO } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Pencil, Repeat, Trash2 } from 'lucide-react';

import { FinanceLedgerStatusBadge } from '@/features/dashboard/finance/components/FinanceLedgerStatusBadge';
import { StayFinanceModal } from '@/features/dashboard/finance/components/StayFinanceModal';
import type { FinanceLedgerEntry } from '@/features/dashboard/finance/lib/financeLedger';
import { recurrenceIntervalLabel } from '@/features/dashboard/finance/lib/recurrence';
import type { FinanceBookingLedgerRow } from '@/features/dashboard/finance/lib/types';

import { FinanceStaysCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { cn } from '@/lib/utils';
import { toneIconWrapClasses } from '@/lib/statusToneColors';
import { formatMoney } from '@/utils/format/currency';

type Props = {
  rows: FinanceLedgerEntry[];
  isLoading: boolean;
  isRefreshing?: boolean;
  onEditTransaction: (entry: FinanceLedgerEntry) => void;
  onDeleteTransaction: (entry: FinanceLedgerEntry) => void;
  onOpenSeries?: (entry: FinanceLedgerEntry) => void;
};

export function FinanceLedgerCardGrid({
  rows,
  isLoading,
  isRefreshing = false,
  onEditTransaction,
  onDeleteTransaction,
  onOpenSeries,
}: Props) {
  const [drawerStay, setDrawerStay] = useState<FinanceBookingLedgerRow | null>(null);

  if (isLoading) return <FinanceStaysCardGridSkeleton />;
  if (rows.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          'native-stagger grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
          'transition-opacity duration-300',
          isRefreshing && 'opacity-60'
        )}
      >
        {rows.map((entry) => {
          const isIncome = entry.type === 'income';
          const amountPrefix = isIncome ? '+' : '−';

          const handleOpen = () => {
            if (entry.source === 'stay' && entry.stay) {
              setDrawerStay(entry.stay ?? null);
              return;
            }
            onEditTransaction(entry);
          };

          return (
            <div
              key={entry.id}
              role="button"
              tabIndex={0}
              className="surface-card-interactive flex min-h-[148px] cursor-pointer flex-col p-3.5 sm:p-4"
              onClick={handleOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpen();
                }
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className={cn(
                      'size-8 shrink-0',
                      toneIconWrapClasses(isIncome ? 'green' : 'red')
                    )}
                  >
                    {isIncome ? (
                      <ArrowUpRight
                        className="size-4 text-emerald-600 dark:text-emerald-400"
                        aria-hidden
                      />
                    ) : (
                      <ArrowDownRight
                        className="size-4 text-red-600 dark:text-red-400"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                      {entry.description}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {format(parseISO(entry.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <FinanceLedgerStatusBadge status={entry.status} />
              </div>

              <div className="mt-auto space-y-2">
                <p className="text-muted-foreground text-xs">{entry.category}</p>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-lg font-bold tabular-nums',
                      isIncome
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {amountPrefix}
                    {formatMoney(Math.abs(entry.netAmount))}
                  </span>
                  {entry.source === 'transaction' ? (
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {entry.transaction?.recurrence_series_id && onOpenSeries ? (
                        <button
                          type="button"
                          className="text-muted-foreground hover:bg-muted/60 hover:text-foreground inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
                          aria-label="View recurring series"
                          onClick={() => onOpenSeries(entry)}
                        >
                          <Repeat className="size-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-muted-foreground hover:bg-muted/60 hover:text-foreground inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
                        aria-label="Edit transaction"
                        onClick={() => onEditTransaction(entry)}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
                        aria-label="Delete transaction"
                        onClick={() => onDeleteTransaction(entry)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
                {entry.transaction?.recurrence_series_id ? (
                  <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                    {recurrenceIntervalLabel(entry.transaction.recurrence_interval)}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <StayFinanceModal row={drawerStay} onClose={() => setDrawerStay(null)} />
    </>
  );
}
