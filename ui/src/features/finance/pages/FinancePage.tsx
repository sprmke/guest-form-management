import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, BedDouble, Building2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
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
    <AdminLayout>
      <div className="space-y-3 sm:space-y-4">
        <section className="surface-card w-full px-3 py-3 sm:px-4 sm:py-4">
          <AdminPageHeader
            id="finance-heading"
            variant="compact"
            title="Finance"
            subtitle="Revenue, profit, and operating costs."
            icon={DollarSign}
            actions={
              <FinanceExportMenu
                query={query}
                summary={summaryQuery.data}
                operating={lineItemsQuery.data}
              />
            }
          />
        </section>

        <section className="surface-card w-full overflow-visible px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
            <div
              className="flex min-w-0 shrink-0 gap-1 overflow-x-auto"
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
                      'inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors sm:min-h-[40px]',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                    onClick={() =>
                      setQuery({ ...query, tab: tab.id, page: 1, q: '' })
                    }
                  >
                    <Icon
                      className={cn(
                        'size-3.5',
                        active ? 'text-primary' : 'text-muted-foreground',
                      )}
                      aria-hidden
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 w-full lg:flex-1">
              <FinancePeriodToolbar
                query={query}
                onChange={setQuery}
                showSearch={
                  query.tab === 'stays' || query.tab === 'operating'
                }
                searchPlaceholder={
                  query.tab === 'stays'
                    ? 'Search guest…'
                    : 'Search transactions…'
                }
                dateNav={dateNav}
                onClearDate={handleClearDate}
                align="end"
              />
            </div>
          </div>
        </section>

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
            isFetching={bookingsQuery.isFetching}
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
    </AdminLayout>
  );
}
