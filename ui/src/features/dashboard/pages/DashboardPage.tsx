import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { BookingDateRangeFilter } from "@/features/admin/components/BookingDateRangeFilter";
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from "@/features/admin/hooks/useDateNavigation";
import { useIsBelowMd } from "@/hooks/useMediaQuery";
import { DashboardSkeleton } from "@/components/skeletons/AdminSkeletons";
import { useAdminSession } from "@/features/admin/hooks/useAdminSession";
import { useDashboardStats } from "@/features/dashboard/hooks/useDashboardStats";
import { DashboardAttentionStrip } from "@/features/dashboard/components/DashboardAttentionStrip";
import { DashboardStatCards } from "@/features/dashboard/components/DashboardStatCards";
import { DashboardFinanceCalendarSection } from "@/features/dashboard/components/DashboardFinanceCalendarSection";
import { formatIsoDate } from "@/features/admin/lib/formatters";
import { detectPresetFromRange, fromIsoDate } from "@/lib/dateNavigation";
import {
  defaultDashboardPeriod,
  resolveDashboardPeriod,
  writeDashboardPeriodParams,
} from "@/features/dashboard/lib/dashboardPeriod";

function manilaGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isBelowMd = useIsBelowMd();
  const { name, email } = useAdminSession();
  const { data, isLoading, error, refetch } = useDashboardStats();

  const period = useMemo(
    () => resolveDashboardPeriod(searchParams),
    [searchParams],
  );

  const initialFrom = fromIsoDate(period.from);
  const initialTo = fromIsoDate(period.to);
  const dateNav = useDateNavigation({
    initialPreset:
      initialFrom && initialTo
        ? detectPresetFromRange(initialFrom, initialTo)
        : "month",
    initialRange:
      initialFrom && initialTo ? { from: initialFrom, to: initialTo } : null,
  });

  useEffect(() => {
    if (searchParams.get("from") || searchParams.get("to")) return;
    const def = defaultDashboardPeriod();
    setSearchParams(writeDashboardPeriodParams(def, searchParams), {
      replace: true,
    });
  }, [searchParams, setSearchParams]);

  const patchPeriod = useCallback(
    (next: { from: string | null; to: string | null }) => {
      if (!next.from || !next.to) return;
      setSearchParams(
        writeDashboardPeriodParams(
          { from: next.from, to: next.to },
          searchParams,
        ),
        { replace: true },
      );
    },
    [searchParams, setSearchParams],
  );

  useSyncDateRangeWithQuery(dateNav, period.from, period.to, patchPeriod);

  const handleClearDate = useCallback(() => {
    dateNav.setDatePreset("year");
  }, [dateNav]);

  const displayName = name ?? email?.split("@")[0] ?? "there";
  const greeting = manilaGreeting();
  const trendLabel = data?.trendWindow.label ?? "";

  return (
    <AdminLayout>
      <div className="min-w-0 max-w-full space-y-3 sm:space-y-4">
        <section className="surface-card min-w-0 w-full px-3 py-3 sm:px-4 sm:py-4">
          <AdminPageHeader
            id="dashboard-heading"
            title="Dashboard"
            subtitle={`${greeting}, ${displayName}.`}
            icon={LayoutDashboard}
            actions={
              <BookingDateRangeFilter
                {...dateNav}
                isActive
                onClear={handleClearDate}
                fullWidth={isBelowMd}
              />
            }
            actionsClassName={isBelowMd ? "w-full justify-end" : "self-center"}
          />
        </section>

        {isLoading && !data ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="surface-card flex flex-col items-center gap-3 px-4 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">
              Could not load dashboard
            </p>
            <p className="max-w-sm text-caption">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            <DashboardAttentionStrip items={data.attention} />

            <DashboardStatCards stats={data} periodLabel={trendLabel} />

            {period.from && period.to ? (
              <DashboardFinanceCalendarSection
                from={period.from}
                to={period.to}
                datePreset={dateNav.datePreset}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
