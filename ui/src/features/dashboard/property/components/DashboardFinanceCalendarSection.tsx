import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { CalendarDays } from 'lucide-react';

import { BookingCalendarView } from '@/features/dashboard/bookings/components/BookingCalendarView';
import {
  BookingCalendarPillLabelToggle,
  type BookingCalendarPillLabelMode,
} from '@/features/dashboard/bookings/components/calendar/BookingCalendarPillLabelToggle';
import { useBookings } from '@/features/dashboard/bookings/hooks/useBookings';
import {
  DEFAULT_BOOKINGS_QUERY,
  type BookingsQuery,
} from '@/features/dashboard/bookings/lib/types';
import { FinanceTransactionsChart } from '@/features/dashboard/finance/components/FinanceTransactionsChart';
import { useFinanceBookings } from '@/features/dashboard/finance/hooks/useFinanceBookings';
import { useFinanceLineItems } from '@/features/dashboard/finance/hooks/useFinanceLineItems';
import { buildFinanceChartData } from '@/features/dashboard/finance/lib/financeChartData';
import { FINANCE_CHART_BOOKINGS_LIMIT } from '@/features/dashboard/finance/lib/financePeriod';
import { DEFAULT_FINANCE_QUERY, type FinanceQuery } from '@/features/dashboard/finance/lib/types';
import { DashboardTransactionsDueCard } from '@/features/dashboard/property/components/DashboardTransactionsDueCard';

import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { formatDateRangeDisplay, fromIsoDate, type DatePreset } from '@/lib/date/navigation';

type Props = {
  from: string;
  to: string;
  datePreset: DatePreset;
};

export function DashboardFinanceCalendarSection({ from, to, datePreset }: Props) {
  const rangeFrom = fromIsoDate(from);
  const rangeTo = fromIsoDate(to);
  const rangeLabel =
    rangeFrom && rangeTo ? formatDateRangeDisplay(rangeFrom, rangeTo, datePreset) : '';

  const financeQuery = useMemo(
    (): FinanceQuery => ({
      ...DEFAULT_FINANCE_QUERY,
      from,
      to,
      page: 1,
      limit: FINANCE_CHART_BOOKINGS_LIMIT,
    }),
    [from, to]
  );

  const bookingsQuery = useMemo(
    (): BookingsQuery => ({
      ...DEFAULT_BOOKINGS_QUERY,
      from,
      to,
      showCompletedBookings: true,
      limit: FINANCE_CHART_BOOKINGS_LIMIT,
      page: 1,
    }),
    [from, to]
  );

  const lineItemsQuery = useFinanceLineItems(financeQuery, { enabled: true });
  const financeBookingsQuery = useFinanceBookings(financeQuery, {
    enabled: true,
  });
  const bookingsQueryResult = useBookings(bookingsQuery);

  const chartData = useMemo(
    () =>
      buildFinanceChartData(
        lineItemsQuery.data ?? [],
        financeBookingsQuery.data?.rows ?? [],
        from,
        to,
        financeQuery.basis
      ),
    [lineItemsQuery.data, financeBookingsQuery.data?.rows, from, to, financeQuery.basis]
  );

  const financeChartsLoading = lineItemsQuery.isPending || financeBookingsQuery.isPending;

  const isBelowLg = useIsBelowLg();
  const calendarCardRef = useRef<HTMLElement>(null);
  const [calendarCardHeight, setCalendarCardHeight] = useState<number>();
  const [calendarPillLabelMode, setCalendarPillLabelMode] =
    useState<BookingCalendarPillLabelMode>('name');

  useLayoutEffect(() => {
    if (isBelowLg) {
      setCalendarCardHeight(undefined);
      return;
    }

    const node = calendarCardRef.current;
    if (!node) return;

    const syncHeight = () => {
      setCalendarCardHeight(node.getBoundingClientRect().height);
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    isBelowLg,
    from,
    to,
    datePreset,
    bookingsQueryResult.isLoading,
    bookingsQueryResult.isFetching,
    lineItemsQuery.isLoading,
  ]);

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      <div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-5 xl:gap-4">
        <FinanceTransactionsChart
          embedded
          isLoading={financeChartsLoading}
          cashFlowData={chartData.cashFlowData}
          incomeBreakdown={chartData.incomeBreakdown}
          expenseBreakdown={chartData.expenseBreakdown}
        />

        <DashboardTransactionsDueCard
          items={lineItemsQuery.data ?? []}
          from={from}
          to={to}
          rangeLabel={rangeLabel}
          datePreset={datePreset}
          syncedHeight={calendarCardHeight}
          isLoading={lineItemsQuery.isLoading}
          isRefreshing={lineItemsQuery.isFetching}
          className="lg:col-span-2 lg:col-start-4 lg:row-start-2"
        />

        <section
          ref={calendarCardRef}
          className="surface-card flex min-w-0 flex-col overflow-hidden p-3 sm:p-4 lg:col-span-3 lg:col-start-1 lg:row-start-2"
        >
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <div className="icon-well-sm shrink-0">
                <CalendarDays className="text-muted-foreground size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-lg font-semibold tracking-tight">Calendar</p>
                <p className="text-muted-foreground text-xs">
                  Tap a date to open booking details · {rangeLabel}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
              <BookingCalendarPillLabelToggle
                value={calendarPillLabelMode}
                onChange={setCalendarPillLabelMode}
              />
            </div>
          </div>

          <BookingCalendarView
            rows={bookingsQueryResult.data?.rows ?? []}
            isLoading={bookingsQueryResult.isLoading}
            error={bookingsQueryResult.error ? (bookingsQueryResult.error as Error).message : null}
            isRefreshing={bookingsQueryResult.isFetching}
            variant="mini"
            rangeFrom={from}
            rangeTo={to}
            datePreset={datePreset}
            pillLabelMode={calendarPillLabelMode}
          />
        </section>
      </div>
    </div>
  );
}
