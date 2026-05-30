import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  BedDouble,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { FinancePeriodToolbar } from '@/features/finance/components/FinancePeriodToolbar';
import { FinanceExportMenu } from '@/features/finance/components/FinanceExportMenu';
import { FinanceOverviewTab } from '@/features/finance/components/FinanceOverviewTab';
import { FinanceStaysTab } from '@/features/finance/components/FinanceStaysTab';
import { FinanceOperatingTab } from '@/features/finance/components/FinanceOperatingTab';
import { useFinanceSummary } from '@/features/finance/hooks/useFinanceSummary';
import { useFinanceBookings } from '@/features/finance/hooks/useFinanceBookings';
import { useFinanceLineItems } from '@/features/finance/hooks/useFinanceLineItems';
import {
  parseFinanceQueryFromParams,
  rangeForPreset,
  writeFinanceQueryToParams,
  type FinanceRangePreset,
} from '@/features/finance/lib/financePeriod';
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from '@/features/admin/hooks/useDateNavigation';
import { fromIsoDate } from '@/lib/dateNavigation';
import type { FinanceQuery, FinanceTab } from '@/features/finance/lib/types';

const TABS: {
  id: FinanceTab;
  label: string;
  icon: typeof BarChart3;
}[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'stays', label: 'Stays', icon: BedDouble },
  { id: 'operating', label: 'Operating', icon: Building2 },
];

export function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();

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
    [setSearchParams],
  );

  // Date navigation — same component as Bookings page
  const initialFromDate = fromIsoDate(query.from);
  const initialToDate = fromIsoDate(query.to);
  const dateNav = useDateNavigation({
    initialPreset: 'month',
    initialRange:
      initialFromDate && initialToDate
        ? { from: initialFromDate, to: initialToDate }
        : null,
  });

  useSyncDateRangeWithQuery(dateNav, query.from, query.to, (next) => {
    setQuery({ ...query, page: 1, from: next.from, to: next.to });
  });

  const handleClearDate = useCallback(() => {
    setQuery({ ...query, page: 1, from: null, to: null });
  }, [query, setQuery]);

  const summaryQuery = useFinanceSummary(query);
  const bookingsQuery = useFinanceBookings(query);
  const lineItemsQuery = useFinanceLineItems(query);

  return (
    <AdminLayout
      title="Finance"
      actions={
        <FinanceExportMenu
          query={query}
          summary={summaryQuery.data}
          operating={lineItemsQuery.data}
        />
      }
    >
      <div className="w-full max-w-full p-3 sm:p-4 lg:p-6">
        {/* Tabs — context first */}
        <div
          className="flex border-b border-slate-200"
          role="tablist"
          aria-label="Finance sections"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = query.tab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  'flex min-h-[44px] items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                )}
                onClick={() =>
                  setQuery({ ...query, tab: tab.id, page: 1 })
                }
              >
                <Icon
                  className={cn(
                    'size-4',
                    active ? 'text-teal-600' : 'text-slate-400',
                  )}
                  aria-hidden
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Controls bar */}
        <div className="mt-4">
          <FinancePeriodToolbar
            query={query}
            onChange={setQuery}
            showStaysSearch={query.tab === 'stays'}
            dateNav={dateNav}
            onClearDate={handleClearDate}
          />
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {query.tab === 'overview' ? (
            <FinanceOverviewTab
              summary={summaryQuery.data}
              isLoading={summaryQuery.isLoading}
            />
          ) : null}

          {query.tab === 'stays' ? (
            <FinanceStaysTab
              query={query}
              rows={bookingsQuery.data?.rows ?? []}
              total={bookingsQuery.data?.total ?? 0}
              isLoading={bookingsQuery.isLoading}
              onQueryChange={setQuery}
            />
          ) : null}

          {query.tab === 'operating' ? (
            <FinanceOperatingTab
              query={query}
              items={lineItemsQuery.data ?? []}
              isLoading={lineItemsQuery.isLoading}
            />
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
}
