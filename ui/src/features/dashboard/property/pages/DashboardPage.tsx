import { useCallback, useEffect, useMemo } from 'react';

import { useSearchParams } from 'react-router-dom';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { BookingDateRangeFilter } from '@/features/dashboard/bookings/components/BookingDateRangeFilter';
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from '@/features/dashboard/bookings/hooks/useDateNavigation';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyGoogleAttentionItem } from '@/features/dashboard/org/hooks/usePropertyGoogleAttentionItem';
import { DashboardAttentionStrip } from '@/features/dashboard/property/components/DashboardAttentionStrip';
import { PropertyGuestPagesMenu } from '@/features/dashboard/property/components/PropertyGuestPagesMenu';
import { DashboardFinanceCalendarSection } from '@/features/dashboard/property/components/DashboardFinanceCalendarSection';
import { DashboardStatCards } from '@/features/dashboard/property/components/DashboardStatCards';
import { useDashboardStats } from '@/features/dashboard/property/hooks/useDashboardStats';
import {
  defaultDashboardPeriod,
  resolveDashboardPeriod,
  writeDashboardPeriodParams,
} from '@/features/dashboard/property/lib/dashboardPeriod';

import { DashboardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { detectPresetFromRange, fromIsoDate } from '@/lib/date/navigation';

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isBelowMd = useIsBelowMd();
  const { propertySlug, property } = useOrgContext();
  const { data, isLoading, error, refetch } = useDashboardStats();

  const period = useMemo(() => resolveDashboardPeriod(searchParams), [searchParams]);

  const initialFrom = fromIsoDate(period.from);
  const initialTo = fromIsoDate(period.to);
  const dateNav = useDateNavigation({
    initialPreset:
      initialFrom && initialTo ? detectPresetFromRange(initialFrom, initialTo) : 'month',
    initialRange: initialFrom && initialTo ? { from: initialFrom, to: initialTo } : null,
  });

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
      setSearchParams(writeDashboardPeriodParams({ from: next.from, to: next.to }, searchParams), {
        replace: true,
      });
    },
    [searchParams, setSearchParams]
  );

  useSyncDateRangeWithQuery(dateNav, period.from, period.to, patchPeriod);

  const handleClearDate = useCallback(() => {
    dateNav.setDatePreset('year');
  }, [dateNav]);

  const trendLabel = data?.trendWindow.label ?? '';
  const googleAttentionItem = usePropertyGoogleAttentionItem();

  const attentionItems = useMemo(() => {
    if (!data) return [];
    if (!googleAttentionItem) return data.attention;
    return [googleAttentionItem, ...data.attention];
  }, [data, googleAttentionItem]);

  const dashboardActions = (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <BookingDateRangeFilter
        {...dateNav}
        isActive
        onClear={handleClearDate}
        fullWidth={isBelowMd}
      />
      <PropertyGuestPagesMenu propertySlug={propertySlug} propertyId={property.id} />
    </div>
  );

  return (
    <div className="min-w-0 max-w-full space-y-3 sm:space-y-4">
      <AdminPageHeader
        id="dashboard-heading"
        variant="compact"
        title="Dashboard"
        subtitle="Overview of your property's performance and activity."
        actions={dashboardActions}
        actionsClassName="w-full sm:w-auto"
      />

      {isLoading && !data ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="surface-card flex flex-col items-center gap-3 px-4 py-16 text-center">
          <p className="text-foreground text-sm font-semibold">Could not load dashboard</p>
          <p className="text-caption max-w-sm">
            {error instanceof Error ? error.message : 'Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="gradient-primary text-primary-foreground shadow-soft inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold hover:brightness-[1.03]"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          <DashboardAttentionStrip items={attentionItems} />

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
  );
}
