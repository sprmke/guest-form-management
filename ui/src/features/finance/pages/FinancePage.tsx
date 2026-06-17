import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { endOfMonth, format, startOfMonth } from "date-fns";
import {
  BarChart3,
  BedDouble,
  DollarSign,
  Receipt,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { FinancePeriodToolbar } from "@/features/finance/components/FinancePeriodToolbar";
import { FinanceExportMenu } from "@/features/finance/components/FinanceExportMenu";
import { FinanceOverviewTab } from "@/features/finance/components/FinanceOverviewTab";
import { FinanceStaysTab } from "@/features/finance/components/FinanceStaysTab";
import { FinanceOperatingTab } from "@/features/finance/components/FinanceOperatingTab";
import { FinanceSettingsTab } from "@/features/finance/components/FinanceSettingsTab";
import { useFinanceSummary } from "@/features/finance/hooks/useFinanceSummary";
import { useFinanceBookings } from "@/features/finance/hooks/useFinanceBookings";
import { CALENDAR_OCCUPANCY_LIMIT } from "@/features/admin/components/calendar/OccupancyCalendarView";
import { useFinanceLineItems } from "@/features/finance/hooks/useFinanceLineItems";
import {
  parseFinanceQueryFromParams,
  rangeForPreset,
  writeFinanceQueryToParams,
  FINANCE_CHART_BOOKINGS_LIMIT,
  type FinanceRangePreset,
} from "@/features/finance/lib/financePeriod";
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from "@/features/admin/hooks/useDateNavigation";
import { fromIsoDate } from "@/lib/dateNavigation";
import { useIsBelowLg } from "@/hooks/useMediaQuery";
import type { FinanceQuery, FinanceTab } from "@/features/finance/lib/types";

const TABS: {
  id: FinanceTab;
  label: string;
  icon: typeof BarChart3;
}[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "stays", label: "Stays", icon: BedDouble },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "settings", label: "Settings", icon: Settings },
];

export function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobileLayout = useIsBelowLg();

  const query = useMemo(() => {
    const parsed = parseFinanceQueryFromParams(searchParams);
    if (!parsed.from && !parsed.to && !searchParams.has("from")) {
      const thisMonth = rangeForPreset("this_month");
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
    initialPreset: "month",
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

  const staysListQuery = useMemo((): FinanceQuery => {
    if (query.tab === "stays" && query.staysView === "calendar") {
      return {
        ...query,
        limit: CALENDAR_OCCUPANCY_LIMIT,
        page: 1,
      };
    }
    return query;
  }, [query]);

  /** Overview chart must include every stay in the period, not the table page cap. */
  const chartBookingsQuery = useMemo(
    (): FinanceQuery => ({
      ...query,
      page: 1,
      limit: FINANCE_CHART_BOOKINGS_LIMIT,
    }),
    [
      query.basis,
      query.from,
      query.to,
      query.includeCancelled,
      query.completedOnly,
      query.q,
    ],
  );

  // Table is desktop-only on Stays; switch away when the viewport narrows.
  useEffect(() => {
    if (!isMobileLayout) return;
    setSearchParams(
      (prev) => {
        const parsed = parseFinanceQueryFromParams(prev);
        if (parsed.tab !== "stays" || parsed.staysView !== "table") {
          return prev;
        }
        return writeFinanceQueryToParams({
          ...parsed,
          staysView: "card",
          page: 1,
        });
      },
      { replace: true },
    );
  }, [isMobileLayout, setSearchParams]);

  // Calendar view loads the full month grid (higher row cap, page 1).
  useEffect(() => {
    if (query.tab !== "stays" || query.staysView !== "calendar") return;
    const needsPatch =
      query.limit !== CALENDAR_OCCUPANCY_LIMIT || query.page !== 1;
    if (!needsPatch) return;
    setQuery({
      ...query,
      limit: CALENDAR_OCCUPANCY_LIMIT,
      page: 1,
    });
  }, [query, setQuery]);

  const handleCalendarMonthChange = useCallback(
    (month: Date) => {
      setQuery({
        ...query,
        from: format(startOfMonth(month), "yyyy-MM-dd"),
        to: format(endOfMonth(month), "yyyy-MM-dd"),
        page: 1,
      });
    },
    [query, setQuery],
  );

  const summaryQuery = useFinanceSummary(query);
  const bookingsQuery = useFinanceBookings(staysListQuery);
  const chartBookingsQueryResult = useFinanceBookings(chartBookingsQuery, {
    enabled: query.tab === "overview",
  });
  const lineItemsQuery = useFinanceLineItems(query);

  return (
    <AdminLayout>
      <div className="space-y-3 sm:space-y-4">
        <AdminPageHeader
          id="finance-heading"
          variant="compact"
          title="Finance"
          subtitle="Revenue, profit, and property transactions."
          icon={DollarSign}
          actions={
            <FinanceExportMenu
              query={query}
              summary={summaryQuery.data}
              operating={lineItemsQuery.data}
            />
          }
        />

        <section className="surface-card w-full overflow-visible px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:gap-3 2xl:items-center">
            <div
              className={cn(
                "flex w-full min-w-0 gap-1",
                "overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "xl:w-auto xl:shrink-0 xl:overflow-visible xl:pb-0",
              )}
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
                      "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                      "max-sm:min-w-[4.5rem] max-sm:flex-1",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                    onClick={() =>
                      setQuery({ ...query, tab: tab.id, page: 1, q: "" })
                    }
                  >
                    <Icon
                      className={cn(
                        "size-3.5",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="w-full min-w-0 xl:min-w-0 xl:flex-1">
              <FinancePeriodToolbar
                query={query}
                onChange={setQuery}
                showSearch={
                  query.tab === "stays" || query.tab === "transactions"
                }
                searchPlaceholder={
                  query.tab === "stays"
                    ? "Search guest…"
                    : query.tab === "transactions"
                      ? "Search transactions…"
                      : undefined
                }
                hideDateFilter={query.tab === "settings"}
                dateNav={dateNav}
                onClearDate={handleClearDate}
                align="end"
              />
            </div>
          </div>
        </section>

        {query.tab === "overview" ? (
          <FinanceOverviewTab
            summary={summaryQuery.data}
            lineItems={lineItemsQuery.data ?? []}
            bookings={chartBookingsQueryResult.data?.rows ?? []}
            basis={query.basis}
            periodFrom={query.from}
            periodTo={query.to}
            isLoading={summaryQuery.isLoading}
          />
        ) : null}

        {query.tab === "stays" ? (
          <FinanceStaysTab
            query={query}
            rows={bookingsQuery.data?.rows ?? []}
            total={bookingsQuery.data?.total ?? 0}
            isLoading={bookingsQuery.isLoading}
            isFetching={bookingsQuery.isFetching}
            error={
              bookingsQuery.error
                ? (bookingsQuery.error as Error).message
                : null
            }
            calendarInitialMonth={dateNav.dateRange.from ?? undefined}
            onCalendarMonthChange={handleCalendarMonthChange}
            onQueryChange={setQuery}
          />
        ) : null}

        {query.tab === "transactions" ? (
          <FinanceOperatingTab query={query} />
        ) : null}

        {query.tab === "settings" ? <FinanceSettingsTab /> : null}
      </div>
    </AdminLayout>
  );
}
