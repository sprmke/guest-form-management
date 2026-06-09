import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { BookingDateRangeFilter } from '@/features/admin/components/BookingDateRangeFilter';
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from '@/features/admin/hooks/useDateNavigation';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { DashboardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { useAdminSession } from '@/features/admin/hooks/useAdminSession';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';
import { DashboardAttentionStrip } from '@/features/dashboard/components/DashboardAttentionStrip';
import { DashboardStatCards } from '@/features/dashboard/components/DashboardStatCards';
import { DashboardPipelineChart } from '@/features/dashboard/components/DashboardPipelineChart';
import { DashboardRevenueChart } from '@/features/dashboard/components/DashboardRevenueChart';
import { DashboardOccupancyChart } from '@/features/dashboard/components/DashboardOccupancyChart';
import { DashboardStaysSection } from '@/features/dashboard/components/DashboardStaysSection';
import {
  defaultStaysListView,
  staysDayGridAvailable,
} from '@/features/dashboard/lib/dashboardStaysListView';
import { formatIsoDate } from '@/features/admin/lib/formatters';
import {
  detectPresetFromRange,
  fromIsoDate,
} from '@/lib/dateNavigation';
import {
  defaultDashboardPeriod,
  resolveDashboardPeriod,
  writeDashboardPeriodParams,
} from '@/features/dashboard/lib/dashboardPeriod';

function manilaGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Manila',
    }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
        : 'month',
    initialRange:
      initialFrom && initialTo
        ? { from: initialFrom, to: initialTo }
        : null,
  });

  // Seed URL with default range on first visit (current month).
  useEffect(() => {
    if (searchParams.get('from') || searchParams.get('to')) return;
    const def = defaultDashboardPeriod();
    setSearchParams(writeDashboardPeriodParams(def, searchParams), {
      replace: true,
    });
  }, [searchParams, setSearchParams]);

  const patchPeriod = useCallback(
    (next: { from: string | null; to: string | null }) => {
      if (!next.from || !next.to) return;
      setSearchParams(
        writeDashboardPeriodParams({ from: next.from, to: next.to }, searchParams),
        { replace: true },
      );
    },
    [searchParams, setSearchParams],
  );

  useSyncDateRangeWithQuery(dateNav, period.from, period.to, patchPeriod);

  const handleClearDate = useCallback(() => {
    dateNav.setDatePreset('year');
  }, [dateNav]);

  const displayName = name ?? email?.split('@')[0] ?? 'there';
  const greeting = manilaGreeting();
  const trendLabel = data?.trendWindow.label ?? '';

  const staysListDefaults = useMemo(() => {
    if (!data) return null;
    return defaultStaysListView(
      data.manilaDate,
      data.trendWindow.from,
      data.trendWindow.to,
      dateNav.datePreset,
    );
  }, [
    data?.manilaDate,
    data?.trendWindow.from,
    data?.trendWindow.to,
    dateNav.datePreset,
  ]);

  const [showEmptyDays, setShowEmptyDays] = useState(true);
  const [showPreviousDates, setShowPreviousDates] = useState(false);

  useEffect(() => {
    if (!staysListDefaults) return;
    setShowEmptyDays(staysListDefaults.showEmptyDays);
    setShowPreviousDates(staysListDefaults.showPreviousDates);
  }, [staysListDefaults]);

  const emptyDaysAvailable = useMemo(() => {
    if (!data) return false;
    return staysDayGridAvailable(
      data.trendWindow.from,
      data.trendWindow.to,
      data.manilaDate,
      showPreviousDates,
    );
  }, [data, showPreviousDates]);

  const staysSectionProps = data
    ? {
        data,
        trendLabel,
        showEmptyDays,
        showPreviousDates,
        onShowEmptyDaysChange: setShowEmptyDays,
        onShowPreviousDatesChange: setShowPreviousDates,
        emptyDaysAvailable,
      }
    : null;

  return (
    <AdminLayout>
      <div className="min-w-0 max-w-full space-y-3 sm:space-y-4">
        <section className="surface-card min-w-0 w-full px-3 py-3 sm:px-4 sm:py-4">
          <AdminPageHeader
            id="dashboard-heading"
            title="Dashboard"
            subtitle={`${greeting}, ${displayName}. Overview for ${data ? formatIsoDate(data.manilaDate) : 'today'}.`}
            icon={LayoutDashboard}
            actions={
              <BookingDateRangeFilter
                {...dateNav}
                isActive
                onClear={handleClearDate}
                fullWidth={isBelowMd}
              />
            }
            actionsClassName={
              isBelowMd ? 'w-full justify-end' : 'self-center'
            }
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
              {error instanceof Error ? error.message : 'Please try again.'}
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

            {staysSectionProps ? (
              <DashboardStaysSection
                {...staysSectionProps}
                className="lg:hidden"
              />
            ) : null}

            <DashboardStatCards stats={data} periodLabel={trendLabel} />

            <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:gap-4">
              <section className="surface-card min-w-0 p-3 sm:p-4">
                <div className="mb-1 flex flex-col gap-0.5 sm:mb-3">
                  <p className="text-section-title font-bold text-foreground">
                    Completed revenue
                  </p>
                  <p className="break-words text-caption">
                    Host net by check-in date · {trendLabel}
                  </p>
                </div>
                <DashboardRevenueChart data={data.revenueTrend} />
              </section>

              <section className="surface-card min-w-0 p-3 sm:p-4">
                <div className="mb-1 flex flex-col gap-0.5 sm:mb-3">
                  <p className="text-section-title font-bold text-foreground">
                    Check-in volume
                  </p>
                  <p className="break-words text-caption">
                    Stays starting · {trendLabel}
                  </p>
                </div>
                <DashboardOccupancyChart data={data.checkInTrend} />
              </section>
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-5 lg:items-stretch xl:gap-4">
              <section className="surface-card flex min-w-0 flex-col overflow-hidden p-3 sm:p-4 lg:col-span-2">
                <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-section-title font-bold text-foreground">
                      Active pipeline
                    </p>
                    <p className="break-words text-caption">
                      By workflow stage · {trendLabel}
                    </p>
                  </div>
                  <Link
                    to={`/bookings?from=${data.trendWindow.from}&to=${data.trendWindow.to}`}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1 self-start rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/10 sm:min-h-[36px] sm:self-auto"
                  >
                    View all
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
                <div className="min-h-0 flex-1">
                  <DashboardPipelineChart
                    data={data.pipeline}
                    periodFrom={data.trendWindow.from}
                    periodTo={data.trendWindow.to}
                  />
                </div>
              </section>

              {staysSectionProps ? (
                <DashboardStaysSection
                  {...staysSectionProps}
                  className="hidden lg:flex"
                />
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
