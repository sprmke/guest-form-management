import { useCallback, useEffect, useMemo } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { endOfMonth, format, startOfMonth } from 'date-fns';
import { CalendarPlus } from 'lucide-react';

import { guestFormPath } from '@/features/guest/lib/guestPublicPaths';

import { AdminListPagination } from '@/features/dashboard/bookings/components/AdminListToolbar';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { BookingCalendarView } from '@/features/dashboard/bookings/components/BookingCalendarView';
import { BookingCardGrid } from '@/features/dashboard/bookings/components/BookingCardGrid';
import { BookingDateRangeFilter } from '@/features/dashboard/bookings/components/BookingDateRangeFilter';
import { BookingFilters } from '@/features/dashboard/bookings/components/BookingFilters';
import { BookingKanban } from '@/features/dashboard/bookings/components/BookingKanban';
import { BookingsSummaryCards } from '@/features/dashboard/bookings/components/BookingsSummaryCards';
import { BookingTable } from '@/features/dashboard/bookings/components/BookingTable';
import type { BookingView } from '@/features/dashboard/bookings/components/BookingViewToggle';
import { useBookings } from '@/features/dashboard/bookings/hooks/useBookings';
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from '@/features/dashboard/bookings/hooks/useDateNavigation';
import {
  resolveBookingListHref,
  type BookingsListScope,
} from '@/features/dashboard/bookings/lib/bookingListNavigation';
import {
  countBookingsByStage,
  effectiveStatusFilter,
  parseBookingStage,
  type BookingStage,
} from '@/features/dashboard/bookings/lib/bookingStages';
import {
  DEFAULT_BOOKINGS_QUERY,
  type BookingsQuery,
  type BookingsSort,
} from '@/features/dashboard/bookings/lib/types';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';
import { orgPropertiesPath } from '@/features/dashboard/org/lib/tenantPaths';

import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { fromIsoDate } from '@/lib/date/navigation';
import { buildPageItems, normalizeAdminPageLimit } from '@/lib/table/pagination';
import { cn } from '@/lib/utils';

const BOARD_BOOKINGS_LIMIT = 100;
const VIEWS: ReadonlyArray<BookingView> = ['table', 'card', 'calendar', 'kanban'];

// ─── URL ↔ query helpers ─────────────────────────────────────

function parseQueryFromParams(sp: URLSearchParams): BookingsQuery {
  const statuses = (sp.get('status') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const parseTri = (v: string | null): boolean | null =>
    v === 'true' ? true : v === 'false' ? false : null;
  const page = Number(sp.get('page') ?? '1');
  const limit = Number(sp.get('limit') ?? String(DEFAULT_BOOKINGS_QUERY.limit));
  const sortParam = (sp.get('sort') ?? DEFAULT_BOOKINGS_QUERY.sort) as BookingsSort;
  const VALID_SORTS: BookingsSort[] = [
    'status_priority:asc',
    'check_in_date:asc',
    'check_in_date:desc',
    'created_at:asc',
    'created_at:desc',
  ];
  const sort: BookingsSort = VALID_SORTS.includes(sortParam as BookingsSort)
    ? (sortParam as BookingsSort)
    : DEFAULT_BOOKINGS_QUERY.sort;
  return {
    q: sp.get('q') ?? '',
    status: statuses,
    from: sp.get('from'),
    to: sp.get('to'),
    hasPets: parseTri(sp.get('hasPets')),
    needParking: parseTri(sp.get('needParking')),
    showCompletedBookings:
      sp.get('showCompletedBookings') === 'true' ||
      sp.get('showPreviousBookings') === 'true' ||
      sp.get('hideStaleCompleted') === 'false',
    sort,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit: normalizeAdminPageLimit(limit),
  };
}

function parseViewFromParams(sp: URLSearchParams, isMobileLayout: boolean): BookingView {
  const v = sp.get('view') as BookingView | null;
  if (v && VIEWS.includes(v)) {
    if (isMobileLayout && v === 'table') return 'card';
    return v;
  }
  return isMobileLayout ? 'card' : 'table';
}

function writeQueryToParams(q: BookingsQuery, cur: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(cur);
  const set = (k: string, v: string | null | undefined) => {
    if (!v) next.delete(k);
    else next.set(k, v);
  };
  set('q', q.q);
  set('status', q.status.length ? q.status.join(',') : null);
  set('from', q.from);
  set('to', q.to);
  set('hasPets', q.hasPets === null ? null : String(q.hasPets));
  set('needParking', q.needParking === null ? null : String(q.needParking));
  set('showCompletedBookings', q.showCompletedBookings ? 'true' : null);
  set('sort', q.sort === DEFAULT_BOOKINGS_QUERY.sort ? null : q.sort);
  set('page', q.page === 1 ? null : String(q.page));
  set('limit', q.limit === DEFAULT_BOOKINGS_QUERY.limit ? null : String(q.limit));
  return next;
}

// ─── Page component ──────────────────────────────────────────

type BookingsListPageProps = {
  scope?: BookingsListScope;
};

export function BookingsListPage({ scope = 'property' }: BookingsListPageProps) {
  const orgContext = useOptionalOrgContext();
  const orgSlug = useOrgSlugParam();
  const propertySlug = orgContext?.propertySlug ?? null;
  const showProperty = scope === 'org';
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobileLayout = useIsBelowLg();
  const query = useMemo(() => parseQueryFromParams(searchParams), [searchParams]);
  const view = useMemo(
    () => parseViewFromParams(searchParams, isMobileLayout),
    [searchParams, isMobileLayout]
  );

  const stage = useMemo(() => parseBookingStage(searchParams.get('stage')), [searchParams]);

  const effectiveStatus = useMemo(
    () => effectiveStatusFilter(stage, query.status),
    [stage, query.status]
  );

  /** Board views need a higher row cap; stage filter maps to `status[]`. */
  const listQuery = useMemo((): BookingsQuery => {
    const base: BookingsQuery = {
      ...query,
      status: effectiveStatus,
    };
    if (view === 'calendar' || view === 'kanban') {
      return {
        ...base,
        showCompletedBookings: true,
        limit: BOARD_BOOKINGS_LIMIT,
        page: 1,
      };
    }
    return base;
  }, [query, view, effectiveStatus]);

  const summaryQuery = useMemo(
    (): BookingsQuery => ({
      q: '',
      status: [],
      from: query.from,
      to: query.to,
      hasPets: query.hasPets,
      needParking: query.needParking,
      showCompletedBookings: true,
      sort: query.sort,
      page: 1,
      limit: BOARD_BOOKINGS_LIMIT,
    }),
    [query.from, query.to, query.hasPets, query.needParking, query.sort]
  );

  // Table is desktop-only; switch away live when the viewport narrows.
  useEffect(() => {
    if (!isMobileLayout || view !== 'table') return;
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.set('view', 'card');
        sp.delete('page');
        return sp;
      },
      { replace: true }
    );
  }, [isMobileLayout, view, setSearchParams]);

  // Hydrate date navigation from URL `from`/`to` (if present).
  // The hook then emits ISO strings back via `useSyncDateRangeWithQuery`
  // when user navigates presets or picks a custom range.
  const initialFromDate = fromIsoDate(query.from);
  const initialToDate = fromIsoDate(query.to);
  const dateNav = useDateNavigation({
    initialPreset: 'month',
    initialRange:
      initialFromDate && initialToDate ? { from: initialFromDate, to: initialToDate } : null,
  });

  const { data, isLoading, isFetching, error } = useBookings(listQuery, { scope });
  const { data: summaryData } = useBookings(summaryQuery, { scope });

  const resolveBookingHref = useCallback(
    (row: Parameters<typeof resolveBookingListHref>[0]) =>
      resolveBookingListHref(row, { orgSlug, propertySlug, scope }),
    [orgSlug, propertySlug, scope]
  );

  const stageCounts = useMemo(
    () => countBookingsByStage(summaryData?.rows ?? []),
    [summaryData?.rows]
  );

  const patch = useCallback(
    (p: Partial<BookingsQuery>) =>
      setSearchParams((prev) => writeQueryToParams({ ...query, ...p }, prev), {
        replace: true,
      }),
    [query, setSearchParams]
  );

  const setStage = useCallback(
    (next: BookingStage) =>
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (next === 'all') sp.delete('stage');
          else sp.set('stage', next);
          sp.delete('page');
          return sp;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  // Keep URL in sync when entering calendar or kanban view (toggle + limit).
  useEffect(() => {
    if (view !== 'calendar' && view !== 'kanban') return;
    const needsPatch =
      !query.showCompletedBookings || query.limit !== BOARD_BOOKINGS_LIMIT || query.page !== 1;
    if (!needsPatch) return;
    patch({
      showCompletedBookings: true,
      limit: BOARD_BOOKINGS_LIMIT,
      page: 1,
    });
  }, [view, query.showCompletedBookings, query.limit, query.page, patch]);

  const handleCalendarMonthChange = useCallback(
    (month: Date) => {
      patch({
        from: format(startOfMonth(month), 'yyyy-MM-dd'),
        to: format(endOfMonth(month), 'yyyy-MM-dd'),
        page: 1,
        showCompletedBookings: true,
      });
    },
    [patch]
  );

  // Sync date-nav state changes (preset switches, custom range, prev/next) → URL.
  // Pass the URL-derived from/to so the hook can detect "URL is empty but the
  // user just clicked Month" and still fire a patch.
  useSyncDateRangeWithQuery(dateNav, query.from, query.to, ({ from, to }) => {
    patch({ from, to, page: 1 });
  });

  const setView = useCallback(
    (next: BookingView) =>
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (next === 'table') sp.delete('view');
          else sp.set('view', next);
          if (next === 'calendar' || next === 'kanban') {
            sp.set('showCompletedBookings', 'true');
            sp.set('limit', String(BOARD_BOOKINGS_LIMIT));
          }
          // Reset to first page when switching views; calendar in particular
          // benefits from seeing all results in the active range.
          sp.delete('page');
          return sp;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  const handleClearDate = useCallback(() => {
    // Reset preset state to the default month view (no range applied).
    dateNav.setDatePreset('month');
    patch({ from: null, to: null, page: 1 });
  }, [dateNav, patch]);

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
    dateNav.setDatePreset('month');
  }, [setSearchParams, dateNav]);

  const total = data?.total ?? 0;
  const rows = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const pageItems = buildPageItems(query.page, pageCount);

  // Calendar view: fetch a higher cap so an entire month range can render.
  // We don't want pagination chopping a month view in half. The list-bookings
  // edge function caps `limit` at 100 — good enough for a single month at this
  // property's volume; widen later if needed via a cursor / infinite query.
  const showPagination = view !== 'calendar' && view !== 'kanban' && pageCount > 1;

  const showTableView = view === 'table' && !isMobileLayout;

  const handleStaySortChange = useCallback(
    (next: BookingsSort) => patch({ sort: next, page: 1 }),
    [patch]
  );

  const bookingActions = (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <BookingDateRangeFilter
        {...dateNav}
        isActive={Boolean(query.from || query.to)}
        onClear={handleClearDate}
        fullWidth={isMobileLayout}
      />
      <Link
        to={
          scope === 'org' && orgSlug
            ? orgPropertiesPath(orgSlug)
            : propertySlug
              ? guestFormPath(propertySlug)
              : '#'
        }
        className={cn(
          'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 sm:px-3.5',
          'gradient-primary text-primary-foreground shadow-soft text-[13px] font-semibold',
          'hover:shadow-primary-glow transition-all duration-200 motion-safe:active:scale-[0.98]'
        )}
      >
        <CalendarPlus className="size-4" aria-hidden />
        <span className="hidden sm:inline">New booking</span>
      </Link>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        id="bookings-heading"
        variant="compact"
        title="Bookings"
        subtitle={
          showProperty
            ? 'Manage and track bookings across all properties.'
            : 'Manage and track all bookings for this property.'
        }
        actions={bookingActions}
        actionsClassName="w-full sm:w-auto"
      />
      <BookingsSummaryCards counts={stageCounts} activeStage={stage} onStageChange={setStage} />
      <BookingFilters
        query={query}
        onChange={patch}
        onReset={resetFilters}
        sort={query.sort}
        onSortChange={handleStaySortChange}
        view={view}
        onViewChange={setView}
        hideTableView={isMobileLayout}
        showPerPage={view !== 'calendar' && view !== 'kanban'}
      />

      {/* Active view */}
      {showTableView && (
        <BookingTable
          rows={rows}
          isLoading={isLoading}
          error={error ? (error as Error).message : null}
          isRefreshing={isFetching}
          sort={query.sort}
          onStaySortChange={handleStaySortChange}
          showProperty={showProperty}
          resolveBookingHref={resolveBookingHref}
        />
      )}
      {view === 'card' && (
        <BookingCardGrid
          rows={rows}
          isLoading={isLoading}
          error={error ? (error as Error).message : null}
          isRefreshing={isFetching}
          showProperty={showProperty}
          resolveBookingHref={resolveBookingHref}
        />
      )}
      {view === 'kanban' && (
        <BookingKanban
          rows={rows}
          isLoading={isLoading}
          error={error ? (error as Error).message : null}
          isRefreshing={isFetching}
          showProperty={showProperty}
        />
      )}
      {view === 'calendar' && (
        <BookingCalendarView
          rows={rows}
          isLoading={isLoading}
          error={error ? (error as Error).message : null}
          isRefreshing={isFetching}
          initialMonth={dateNav.dateRange.from}
          onMonthChange={handleCalendarMonthChange}
          showProperty={showProperty}
          resolveBookingHref={resolveBookingHref}
        />
      )}

      {/* Pagination — hidden in calendar view (range already filters scope) */}
      {showPagination && (
        <AdminListPagination
          ariaLabel="Bookings pagination"
          page={query.page}
          pageCount={pageCount}
          pageItems={pageItems}
          isLoading={isLoading}
          onPageChange={(page) => patch({ page })}
        />
      )}
    </div>
  );
}
