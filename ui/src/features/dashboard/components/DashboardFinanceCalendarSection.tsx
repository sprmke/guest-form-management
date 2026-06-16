import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import { BookingCalendarView } from "@/features/admin/components/BookingCalendarView";
import {
  BookingCalendarPillLabelToggle,
  type BookingCalendarPillLabelMode,
} from "@/features/admin/components/calendar/BookingCalendarPillLabelToggle";
import { useBookings } from "@/features/admin/hooks/useBookings";
import {
  DEFAULT_BOOKINGS_QUERY,
  type BookingsQuery,
} from "@/features/admin/lib/types";
import { FinanceTransactionsChart } from "@/features/finance/components/FinanceTransactionsChart";
import { DashboardTransactionsDueCard } from "@/features/dashboard/components/DashboardTransactionsDueCard";
import { useFinanceBookings } from "@/features/finance/hooks/useFinanceBookings";
import { useFinanceLineItems } from "@/features/finance/hooks/useFinanceLineItems";
import { buildFinanceChartData } from "@/features/finance/lib/financeChartData";
import {
  DEFAULT_FINANCE_QUERY,
  type FinanceQuery,
} from "@/features/finance/lib/types";
import { FINANCE_CHART_BOOKINGS_LIMIT } from "@/features/finance/lib/financePeriod";
import { useIsBelowLg } from "@/hooks/useMediaQuery";
import {
  formatDateRangeDisplay,
  fromIsoDate,
  type DatePreset,
} from "@/lib/dateNavigation";

type Props = {
  from: string;
  to: string;
  datePreset: DatePreset;
};

export function DashboardFinanceCalendarSection({
  from,
  to,
  datePreset,
}: Props) {
  const rangeFrom = fromIsoDate(from);
  const rangeTo = fromIsoDate(to);
  const rangeLabel =
    rangeFrom && rangeTo
      ? formatDateRangeDisplay(rangeFrom, rangeTo, datePreset)
      : "";

  const financeQuery = useMemo(
    (): FinanceQuery => ({
      ...DEFAULT_FINANCE_QUERY,
      tab: "overview",
      from,
      to,
      page: 1,
      limit: FINANCE_CHART_BOOKINGS_LIMIT,
    }),
    [from, to],
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
    [from, to],
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
        financeQuery.basis,
      ),
    [
      lineItemsQuery.data,
      financeBookingsQuery.data?.rows,
      from,
      to,
      financeQuery.basis,
    ],
  );

  const financeChartsLoading =
    lineItemsQuery.isPending || financeBookingsQuery.isPending;

  const bookingsCalendarHref = `/bookings?from=${from}&to=${to}&view=calendar&showCompletedBookings=true`;
  const isBelowLg = useIsBelowLg();
  const calendarCardRef = useRef<HTMLElement>(null);
  const [calendarCardHeight, setCalendarCardHeight] = useState<number>();
  const [calendarPillLabelMode, setCalendarPillLabelMode] =
    useState<BookingCalendarPillLabelMode>("name");

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
              <div className="icon-well-sm shrink-0 bg-muted/80">
                <CalendarDays
                  className="size-[18px] text-muted-foreground"
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <p className="text-section-title font-bold text-foreground">
                  Bookings calendar
                </p>
                <p className="text-caption">
                  Tap a date to open booking details · {rangeLabel}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
              <BookingCalendarPillLabelToggle
                value={calendarPillLabelMode}
                onChange={setCalendarPillLabelMode}
              />
              <Link
                to={bookingsCalendarHref}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/10 sm:min-h-[36px]"
              >
                Open calendar
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>

          <BookingCalendarView
            rows={bookingsQueryResult.data?.rows ?? []}
            isLoading={bookingsQueryResult.isLoading}
            error={
              bookingsQueryResult.error
                ? (bookingsQueryResult.error as Error).message
                : null
            }
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
