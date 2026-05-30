import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
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

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="bg-slate-50/80 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
          <tbody className="divide-y divide-slate-100">
            {isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Loading stays…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <BedDouble className="mx-auto size-10 text-slate-200" />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    No stays in this period
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
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
                    className="group cursor-pointer transition-colors hover:bg-slate-50/60"
                    onClick={() => setDrawerRow(row)}
                  >
                    <td className="px-4 py-3.5">
                      <p className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
                        {row.guest_facebook_name ||
                          row.primary_guest_name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 md:hidden">
                        {formatBookingDateShort(row.check_in_date)}
                        {row.check_out_date
                          ? ` – ${formatBookingDateShort(row.check_out_date)}`
                          : ''}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <span className="whitespace-nowrap text-xs text-slate-600">
                        {formatBookingDateShort(row.check_in_date)}
                      </span>
                      {row.check_out_date && (
                        <span className="text-xs text-slate-400">
                          {' – '}
                          {formatBookingDateShort(row.check_out_date)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-sm tabular-nums text-slate-600 lg:table-cell">
                      {formatMoney(fin.totalGuestBalance)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm tabular-nums text-slate-800">
                      {formatMoney(fin.guestCollected)}
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-sm tabular-nums text-slate-600 sm:table-cell">
                      {formatMoney(fin.parkingMargin)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          'text-sm tabular-nums font-semibold',
                          isRealized
                            ? fin.hostNet >= 0
                              ? 'text-emerald-700'
                              : 'text-red-600'
                            : 'text-amber-700',
                        )}
                      >
                        {formatMoney(netDisplay)}
                      </span>
                      {!isRealized && (
                        <span className="ml-1 text-[9px] font-semibold uppercase text-amber-500">
                          est
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        to={`/bookings/${row.id}`}
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
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

      {/* Pagination bar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{total}</span>{' '}
          stay{total === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1">
            <ArrowUpDown className="size-3 text-slate-400" aria-hidden />
            <select
              className="h-7 appearance-none border-0 bg-transparent pr-5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-0"
              value={query.sort}
              onChange={(e) =>
                onQueryChange({
                  ...query,
                  page: 1,
                  sort: e.target.value as FinanceQuery['sort'],
                })
              }
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
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
              onClick={() =>
                onQueryChange({ ...query, page: query.page - 1 })
              }
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-slate-500">
              {query.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={query.page >= totalPages}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
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
