import { useCallback, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { endOfMonth, format, startOfMonth } from 'date-fns';
import { Plus } from 'lucide-react';

import { useAdminMobileCardViewGuard } from '@/hooks/useAdminMobileCardViewGuard';

import { AdminListPagination } from '@/features/dashboard/bookings/components/AdminListToolbar';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { BookingDateRangeFilter } from '@/features/dashboard/bookings/components/BookingDateRangeFilter';
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from '@/features/dashboard/bookings/hooks/useDateNavigation';
import { FinanceExportMenu } from '@/features/dashboard/finance/components/FinanceExportMenu';
import { FinanceLedgerCalendarView } from '@/features/dashboard/finance/components/FinanceLedgerCalendarView';
import { FinanceLedgerCardGrid } from '@/features/dashboard/finance/components/FinanceLedgerCardGrid';
import { FinanceLedgerTable } from '@/features/dashboard/finance/components/FinanceLedgerTable';
import { FinanceLedgerToolbar } from '@/features/dashboard/finance/components/FinanceLedgerToolbar';
import { FinanceSummaryCards } from '@/features/dashboard/finance/components/FinanceSummaryCards';
import { FinanceTransactionModals } from '@/features/dashboard/finance/components/FinanceTransactionModals';
import { FinanceTransactionsChart } from '@/features/dashboard/finance/components/FinanceTransactionsChart';
import { useFinanceLineItems } from '@/features/dashboard/finance/hooks/useFinanceLineItems';
import { useFinanceSummary } from '@/features/dashboard/finance/hooks/useFinanceSummary';
import { buildFinanceChartData } from '@/features/dashboard/finance/lib/financeChartData';
import {
  buildFinanceLedgerEntries,
  collectLedgerCategories,
  filterFinanceLedgerEntries,
  paginateFinanceLedgerEntries,
  sortFinanceLedgerEntries,
  type FinanceLedgerEntry,
} from '@/features/dashboard/finance/lib/financeLedger';
import {
  parseFinanceQueryFromParams,
  previousFinancePeriodRange,
  rangeForPreset,
  writeFinanceQueryToParams,
  type FinanceRangePreset,
} from '@/features/dashboard/finance/lib/financePeriod';
import {
  computeFinanceSummaryCardStats,
  withPeriodComparison,
} from '@/features/dashboard/finance/lib/financeSummaryStats';
import type { FinanceLineItem, FinanceQuery } from '@/features/dashboard/finance/lib/types';

import { FinanceOverviewSkeleton } from '@/components/skeletons/AdminSkeletons';
import { useIsBelowLg, useIsBelowMd } from '@/hooks/useMediaQuery';
import { fromIsoDate } from '@/lib/date/navigation';
import { buildPageItems } from '@/lib/table/pagination';
import { cn } from '@/lib/utils';

export function ParkingFinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobileLayout = useIsBelowLg();
  const isBelowMd = useIsBelowMd();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinanceLineItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinanceLineItem | null>(null);
  const [seriesAnchor, setSeriesAnchor] = useState<FinanceLineItem | null>(null);

  const query = useMemo(() => {
    const parsed = parseFinanceQueryFromParams(searchParams);
    if (!parsed.from && !parsed.to && !searchParams.has('from')) {
      const thisMonth = rangeForPreset('this_month');
      return { ...parsed, ...thisMonth };
    }
    return parsed;
  }, [searchParams]);

  const setQuery = useCallback(
    (next: FinanceQuery, preset?: FinanceRangePreset) => {
      setSearchParams(writeFinanceQueryToParams(next, preset), {
        replace: true,
      });
    },
    [setSearchParams]
  );

  const initialFrom = fromIsoDate(query.from);
  const initialTo = fromIsoDate(query.to);
  const dateNav = useDateNavigation({
    initialPreset: 'month',
    initialRange: initialFrom && initialTo ? { from: initialFrom, to: initialTo } : null,
  });

  useSyncDateRangeWithQuery(dateNav, query.from, query.to, ({ from, to }) => {
    setQuery({ ...query, from, to, page: 1 });
  });

  const handleClearDate = useCallback(() => {
    dateNav.setDatePreset('month');
    setQuery({ ...query, from: null, to: null, page: 1 });
  }, [dateNav, query, setQuery]);

  const previousPeriodQuery = useMemo((): FinanceQuery => {
    const previous = previousFinancePeriodRange(query.from, query.to);
    return { ...query, ...previous, page: 1 };
  }, [query]);

  const summaryQuery = useFinanceSummary(query);
  const previousSummaryQuery = useFinanceSummary(previousPeriodQuery);
  const lineItemsQuery = useFinanceLineItems(query);

  useAdminMobileCardViewGuard(isMobileLayout, query, setQuery);

  const allEntries = useMemo(() => {
    return buildFinanceLedgerEntries([], lineItemsQuery.data ?? []);
  }, [lineItemsQuery.data]);

  const filteredEntries = useMemo(
    () => filterFinanceLedgerEntries(allEntries, query),
    [allEntries, query]
  );

  const sortedEntries = useMemo(
    () => sortFinanceLedgerEntries(filteredEntries, query.sort),
    [filteredEntries, query.sort]
  );

  const categories = useMemo(() => collectLedgerCategories(allEntries), [allEntries]);

  const pagedEntries = useMemo(() => {
    if (query.view === 'calendar') {
      return { rows: sortedEntries, total: sortedEntries.length };
    }
    return paginateFinanceLedgerEntries(sortedEntries, query.page, query.limit);
  }, [sortedEntries, query.page, query.limit, query.view]);

  const chartData = useMemo(
    () => buildFinanceChartData(lineItemsQuery.data ?? [], [], query.from, query.to, query.basis),
    [lineItemsQuery.data, query.from, query.to, query.basis]
  );

  const summaryStats = useMemo(() => {
    if (!summaryQuery.data) return null;
    const current = computeFinanceSummaryCardStats(summaryQuery.data, lineItemsQuery.data ?? []);
    const previous = previousSummaryQuery.data
      ? computeFinanceSummaryCardStats(previousSummaryQuery.data, [])
      : undefined;
    return withPeriodComparison(current, previous);
  }, [summaryQuery.data, previousSummaryQuery.data, lineItemsQuery.data]);

  const pageCount = Math.max(1, Math.ceil(pagedEntries.total / query.limit));
  const pageItems = useMemo(() => buildPageItems(query.page, pageCount), [query.page, pageCount]);

  const showCalendarView = query.view === 'calendar';
  const showTableView = query.view === 'table' && !isMobileLayout;
  const showCardView = query.view === 'card' || (isMobileLayout && query.view !== 'calendar');
  const showPagination = !showCalendarView && pageCount > 1;
  const isLedgerLoading = lineItemsQuery.isLoading;
  const isLedgerRefreshing = lineItemsQuery.isFetching;
  const chartsLoading = lineItemsQuery.isPending;

  const handleCalendarMonthChange = useCallback(
    (month: Date) => {
      setQuery({
        ...query,
        from: format(startOfMonth(month), 'yyyy-MM-dd'),
        to: format(endOfMonth(month), 'yyyy-MM-dd'),
        page: 1,
      });
    },
    [query, setQuery]
  );

  function handleEditEntry(entry: FinanceLedgerEntry) {
    if (!entry.transaction) return;
    setEditingItem(entry.transaction);
    setCreateOpen(false);
  }

  function handleDeleteEntry(entry: FinanceLedgerEntry) {
    if (!entry.transaction) return;
    setDeletingItem(entry.transaction);
  }

  function handleOpenSeries(entry: FinanceLedgerEntry) {
    if (!entry.transaction?.recurrence_series_id) return;
    setSeriesAnchor(entry.transaction);
  }

  return (
    
      <div className="space-y-3 sm:space-y-4 lg:space-y-5">
        <AdminPageHeader
          id="finance-heading"
          variant="compact"
          card={false}
          title="Finance"
          subtitle="Track income and expenses for this parking slot."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <BookingDateRangeFilter
                {...dateNav}
                isActive={!!(query.from || query.to)}
                onClear={handleClearDate}
                fullWidth={isBelowMd}
              />
              <FinanceExportMenu
                query={query}
                summary={summaryQuery.data}
                operating={lineItemsQuery.data}
              />
              <button
                type="button"
                className={cn(
                  'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2',
                  'gradient-primary text-primary-foreground shadow-soft text-[13px] font-semibold',
                  'hover:shadow-primary-glow transition-all duration-200 motion-safe:active:scale-[0.98]'
                )}
                onClick={() => {
                  setEditingItem(null);
                  setCreateOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden />
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          }
          actionsClassName="w-full sm:w-auto"
        />

        {summaryQuery.isLoading && !summaryStats ? (
          <FinanceOverviewSkeleton />
        ) : summaryStats ? (
          <FinanceSummaryCards {...summaryStats} />
        ) : null}

        <FinanceTransactionsChart
          cashFlowData={chartData.cashFlowData}
          incomeBreakdown={chartData.incomeBreakdown}
          expenseBreakdown={chartData.expenseBreakdown}
          isLoading={chartsLoading}
        />

        <FinanceLedgerToolbar
          query={query}
          categories={categories}
          onChange={setQuery}
          hideTableView={isMobileLayout}
          showPerPage={!showCalendarView}
        />

        {showCalendarView ? (
          <FinanceLedgerCalendarView
            rows={sortedEntries}
            isLoading={isLedgerLoading}
            isRefreshing={isLedgerRefreshing}
            initialMonth={dateNav.dateRange.from ?? undefined}
            onMonthChange={handleCalendarMonthChange}
            onEditTransaction={handleEditEntry}
            onDeleteTransaction={handleDeleteEntry}
            onOpenSeries={handleOpenSeries}
          />
        ) : null}

        {showTableView ? (
          <FinanceLedgerTable
            rows={pagedEntries.rows}
            onEditTransaction={handleEditEntry}
            onDeleteTransaction={handleDeleteEntry}
            onOpenSeries={handleOpenSeries}
          />
        ) : null}

        {showCardView ? (
          pagedEntries.rows.length === 0 && !isLedgerLoading ? (
            <div className="border-border/60 flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <p className="text-foreground text-sm font-semibold">
                No transactions in this period
              </p>
            </div>
          ) : (
            <FinanceLedgerCardGrid
              rows={pagedEntries.rows}
              isLoading={isLedgerLoading}
              isRefreshing={isLedgerRefreshing}
              onEditTransaction={handleEditEntry}
              onDeleteTransaction={handleDeleteEntry}
              onOpenSeries={handleOpenSeries}
            />
          )
        ) : null}

        {showPagination ? (
          <AdminListPagination
            page={query.page}
            pageCount={pageCount}
            pageItems={pageItems}
            isLoading={isLedgerLoading}
            onPageChange={(page) => setQuery({ ...query, page })}
            ariaLabel="Finance ledger pagination"
          />
        ) : null}

        <FinanceTransactionModals
          query={query}
          createOpen={createOpen}
          editingItem={editingItem}
          deletingItem={deletingItem}
          seriesAnchor={seriesAnchor}
          onCloseEditor={() => {
            setCreateOpen(false);
            setEditingItem(null);
          }}
          onDeletingChange={setDeletingItem}
          onSeriesAnchorChange={setSeriesAnchor}
        />
      </div>
    
  );
}
