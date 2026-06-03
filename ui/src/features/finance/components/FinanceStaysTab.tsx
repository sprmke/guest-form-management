import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { FinanceStaysTableSkeleton } from '@/components/skeletons/AdminSkeletons';
import {
  formatBookingDateShort,
  formatMoney,
} from '@/features/admin/lib/formatters';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { StayFinanceDrawer } from '@/features/finance/components/StayFinanceDrawer';
import type { FinanceBookingLedgerRow, FinanceQuery } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  query: FinanceQuery;
  rows: FinanceBookingLedgerRow[];
  total: number;
  isLoading: boolean;
  onQueryChange: (next: FinanceQuery) => void;
};

export function FinanceStaysTab({
  query,
  rows,
  total,
  isLoading,
  onQueryChange,
}: Props) {
  const [drawerRow, setDrawerRow] = useState<FinanceBookingLedgerRow | null>(
    null,
  );
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  if (isLoading && rows.length === 0) {
    return <FinanceStaysTableSkeleton />;
  }

  return (
    <div className="space-y-3">
      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="bg-muted/40 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Guest</th>
              <th className="hidden px-4 py-3 md:table-cell">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 text-right lg:table-cell">Due</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">Parking</th>
              <th className="px-4 py-3 text-right">Net</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-separator">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <BedDouble className="mx-auto size-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No stays in this period
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Adjust dates or remove filters to see results.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const fin = row.financials;
                const netDisplay = fin.isCompleted
                  ? fin.hostNet
                  : fin.projectedNet;
                const isRealized = fin.isCompleted;
                return (
                  <tr
                    key={row.id}
                    className="group cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setDrawerRow(row)}
                  >
                    <td className="px-4 py-3.5">
                      <p className="max-w-[180px] truncate text-sm font-semibold text-foreground">
                        {row.guest_facebook_name ||
                          row.primary_guest_name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground md:hidden">
                        {formatBookingDateShort(row.check_in_date)}
                        {row.check_out_date
                          ? ` – ${formatBookingDateShort(row.check_out_date)}`
                          : ''}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatBookingDateShort(row.check_in_date)}
                      </span>
                      {row.check_out_date && (
                        <span className="text-xs text-muted-foreground/70">
                          {' – '}
                          {formatBookingDateShort(row.check_out_date)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-sm tabular-nums text-muted-foreground lg:table-cell">
                      {formatMoney(fin.totalGuestBalance)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm tabular-nums text-foreground">
                      {formatMoney(fin.guestCollected)}
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
                      {formatMoney(fin.parkingMargin)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          'text-sm tabular-nums font-semibold',
                          isRealized
                            ? fin.hostNet >= 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-red-600 dark:text-red-400'
                            : 'text-amber-700 dark:text-amber-300',
                        )}
                      >
                        {formatMoney(netDisplay)}
                      </span>
                      {!isRealized && (
                        <span className="ml-1 text-[9px] font-semibold uppercase text-amber-500 dark:text-amber-400">
                          est
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        to={`/bookings/${row.id}`}
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                        aria-label="Open booking"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 px-0.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{total}</span>{' '}
          stay{total === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1">
            <ArrowUpDown className="size-3 text-muted-foreground" aria-hidden />
            <select
              className="h-7 appearance-none border-0 bg-transparent pr-5 text-xs font-medium text-foreground focus:outline-none focus:ring-0"
              value={query.sort}
              onChange={(e) =>
                onQueryChange({
                  ...query,
                  page: 1,
                  sort: e.target.value as FinanceQuery['sort'],
                })
              }
              aria-label="Sort stays"
            >
              <option value="check_in_date:desc">Newest first</option>
              <option value="check_in_date:asc">Oldest first</option>
              <option value="host_net:desc">Net ↓</option>
              <option value="host_net:asc">Net ↑</option>
            </select>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={query.page <= 1}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              onClick={() =>
                onQueryChange({ ...query, page: query.page - 1 })
              }
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-muted-foreground">
              {query.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={query.page >= totalPages}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              onClick={() =>
                onQueryChange({ ...query, page: query.page + 1 })
              }
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <StayFinanceDrawer
        row={drawerRow}
        onClose={() => setDrawerRow(null)}
      />
    </div>
  );
}
