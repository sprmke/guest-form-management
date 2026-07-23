import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { endOfMonth, format, startOfMonth } from 'date-fns';
import { Plus, Wrench } from 'lucide-react';

import { useAdminMobileCardViewGuard } from '@/hooks/useAdminMobileCardViewGuard';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { BookingDateRangeFilter } from '@/features/dashboard/bookings/components/BookingDateRangeFilter';
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from '@/features/dashboard/bookings/hooks/useDateNavigation';
import { MaintenanceByCategoryCard } from '@/features/dashboard/maintenance/components/MaintenanceByCategoryCard';
import { MaintenanceExportMenu } from '@/features/dashboard/maintenance/components/MaintenanceExportMenu';
import { MaintenanceRemindersTab } from '@/features/dashboard/maintenance/components/MaintenanceRemindersTab';
import { MaintenanceRemindersToolbar } from '@/features/dashboard/maintenance/components/MaintenanceRemindersToolbar';
import { MaintenanceSummaryCards } from '@/features/dashboard/maintenance/components/MaintenanceSummaryCards';
import { useMaintenanceItems } from '@/features/dashboard/maintenance/hooks/useMaintenanceItems';
import { useMaintenanceSummary } from '@/features/dashboard/maintenance/hooks/useMaintenanceSummary';
import {
  parseMaintenanceQueryFromParams,
  rangeForPreset,
  writeMaintenanceQueryToParams,
  type MaintenanceRangePreset,
} from '@/features/dashboard/maintenance/lib/maintenancePeriod';
import { collectMaintenanceCategories } from '@/features/dashboard/maintenance/lib/maintenanceReminders';
import type { MaintenanceQuery } from '@/features/dashboard/maintenance/lib/types';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { propertyNotificationsPath } from '@/features/dashboard/org/lib/tenantPaths';

import { FinanceOverviewSkeleton } from '@/components/skeletons/AdminSkeletons';
import { useIsBelowLg, useIsBelowMd } from '@/hooks/useMediaQuery';
import { fromIsoDate } from '@/lib/date/navigation';
import { cn } from '@/lib/utils';

export function MaintenancePage() {
  const navigate = useNavigate();
  const { orgSlug, propertySlug } = useOrgContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobileLayout = useIsBelowLg();
  const isBelowMd = useIsBelowMd();
  const [createOpen, setCreateOpen] = useState(false);

  const query = useMemo(() => {
    const parsed = parseMaintenanceQueryFromParams(searchParams);
    if (!parsed.from && !parsed.to && !searchParams.has('from')) {
      const thisMonth = rangeForPreset('this_month');
      return { ...parsed, ...thisMonth };
    }
    return parsed;
  }, [searchParams]);

  const setQuery = useCallback(
    (next: MaintenanceQuery, preset?: MaintenanceRangePreset) => {
      setSearchParams(writeMaintenanceQueryToParams(next, preset), {
        replace: true,
      });
    },
    [setSearchParams]
  );

  const initialFromDate = fromIsoDate(query.from);
  const initialToDate = fromIsoDate(query.to);
  const dateNav = useDateNavigation({
    initialPreset: 'month',
    initialRange:
      initialFromDate && initialToDate ? { from: initialFromDate, to: initialToDate } : null,
  });

  useEffect(() => {
    if (searchParams.get('from') || searchParams.get('to')) return;
    const def = rangeForPreset('this_month');
    setSearchParams(
      writeMaintenanceQueryToParams(
        {
          ...parseMaintenanceQueryFromParams(searchParams),
          ...def,
          page: 1,
        },
        'this_month'
      ),
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('tab') !== 'settings') return;
    navigate(propertyNotificationsPath(orgSlug, propertySlug, 'maintenance'), {
      replace: true,
    });
  }, [navigate, orgSlug, propertySlug, searchParams]);

  useSyncDateRangeWithQuery(dateNav, query.from, query.to, (next) => {
    setQuery({ ...query, page: 1, from: next.from, to: next.to });
  });

  const handleClearDate = useCallback(() => {
    setQuery({ ...query, page: 1, from: null, to: null });
  }, [query, setQuery]);

  useAdminMobileCardViewGuard(isMobileLayout, query, setQuery);

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

  const summaryQuery = useMaintenanceSummary(query);
  const itemsQuery = useMaintenanceItems(query, { includeDueInRange: true });
  const summary = summaryQuery.data;
  const showCalendarView = query.view === 'calendar';
  const categories = useMemo(
    () => collectMaintenanceCategories(itemsQuery.data ?? []),
    [itemsQuery.data]
  );

  return (
    
      <div className="space-y-3 sm:space-y-4 lg:space-y-5">
        <AdminPageHeader
          id="maintenance-heading"
          variant="compact"
          card={false}
          title="Maintenance"
          subtitle="Set maintenance items and reminders."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <BookingDateRangeFilter
                {...dateNav}
                isActive={!!(query.from || query.to)}
                onClear={handleClearDate}
                fullWidth={isBelowMd}
              />
              <MaintenanceExportMenu
                query={query}
                summary={summaryQuery.data}
                items={itemsQuery.data}
              />
              <button
                type="button"
                className={cn(
                  'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2',
                  'gradient-primary text-primary-foreground shadow-soft text-[13px] font-semibold',
                  'hover:shadow-primary-glow transition-all duration-200 motion-safe:active:scale-[0.98]'
                )}
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" aria-hidden />
                <span className="hidden sm:inline">Add reminder</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          }
          actionsClassName="w-full sm:w-auto"
        />

        {summaryQuery.isLoading && !summary ? (
          <FinanceOverviewSkeleton />
        ) : summary ? (
          <MaintenanceSummaryCards
            total={summary.total}
            telegramEnabled={summary.telegramEnabled}
            completed={summary.completed}
            pending={summary.pending}
          />
        ) : (
          <div className="surface-card flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:py-20">
            <div className="icon-well-sm bg-muted/80">
              <Wrench className="text-muted-foreground size-[18px]" aria-hidden />
            </div>
            <p className="text-section-title text-foreground font-bold">No data for this period</p>
          </div>
        )}

        {summary ? <MaintenanceByCategoryCard rows={summary.byCategory} /> : null}

        <MaintenanceRemindersToolbar
          query={query}
          categories={categories}
          onChange={setQuery}
          hideTableView={isMobileLayout}
          showPerPage={!showCalendarView}
        />

        <MaintenanceRemindersTab
          query={query}
          onQueryChange={setQuery}
          createOpen={createOpen}
          onCreateOpenChange={setCreateOpen}
          calendarInitialMonth={dateNav.dateRange.from ?? undefined}
          onCalendarMonthChange={handleCalendarMonthChange}
        />
      </div>
    
  );
}
