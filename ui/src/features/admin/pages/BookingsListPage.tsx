import { useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarPlus, RefreshCw, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useBookings } from '@/features/admin/hooks/useBookings';
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from '@/features/admin/hooks/useDateNavigation';
import { fromIsoDate } from '@/lib/dateNavigation';
import { BookingFilters } from '@/features/admin/components/BookingFilters';
import {
  BookingsListControls,
  BookingsListPagination,
  BookingsListSummary,
} from '@/features/admin/components/BookingsListControls';
import { BookingTable } from '@/features/admin/components/BookingTable';
import { BookingCardGrid } from '@/features/admin/components/BookingCardGrid';
import { BookingCalendarView } from '@/features/admin/components/BookingCalendarView';
import {
  BookingViewToggle,
  type BookingView,
} from '@/features/admin/components/BookingViewToggle';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import {
  DEFAULT_BOOKINGS_QUERY,
  type BookingsQuery,
  type BookingsSort,
} from '@/features/admin/lib/types';
import { useGmailMailIntegrationStatus } from '@/features/admin/hooks/useGmailMailIntegration';
import { showGmailDisconnectedToast } from '@/features/admin/components/GmailDisconnectedToast';
const PAGE_SIZES = [25, 50, 100] as const;
const VIEWS: ReadonlyArray<BookingView> = ['table', 'card', 'calendar'];

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
  const sortParam = (sp.get('sort') ??
    DEFAULT_BOOKINGS_QUERY.sort) as BookingsSort;
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
    limit: (PAGE_SIZES as ReadonlyArray<number>).includes(limit)
      ? limit
      : DEFAULT_BOOKINGS_QUERY.limit,
  };
}

function parseViewFromParams(
  sp: URLSearchParams,
  isMobileLayout: boolean,
): BookingView {
  const v = sp.get('view') as BookingView | null;
  if (v && VIEWS.includes(v)) {
    if (isMobileLayout && v === 'table') return 'card';
    return v;
  }
  return isMobileLayout ? 'card' : 'table';
}

function writeQueryToParams(
  q: BookingsQuery,
  cur: URLSearchParams,
): URLSearchParams {
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
  set(
    'showCompletedBookings',
    q.showCompletedBookings ? 'true' : null,
  );
  set('sort', q.sort === DEFAULT_BOOKINGS_QUERY.sort ? null : q.sort);
  set('page', q.page === 1 ? null : String(q.page));
  set(
    'limit',
    q.limit === DEFAULT_BOOKINGS_QUERY.limit ? null : String(q.limit),
  );
  return next;
}

// ─── Smart page number builder ───────────────────────────────

type PageItem = number | 'ellipsis';

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: PageItem[] = [1];

  if (current > 3) items.push('ellipsis');

  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  for (let p = lo; p <= hi; p++) items.push(p);

  if (current < total - 2) items.push('ellipsis');

  items.push(total);
  return items;
}

// ─── Page component ──────────────────────────────────────────

export function BookingsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobileLayout = useIsBelowLg();
  const query = useMemo(
    () => parseQueryFromParams(searchParams),
    [searchParams],
  );
  const view = useMemo(
    () => parseViewFromParams(searchParams, isMobileLayout),
    [searchParams, isMobileLayout],
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
      { replace: true },
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
      initialFromDate && initialToDate
        ? { from: initialFromDate, to: initialToDate }
        : null,
  });

  const { data, isLoading, isFetching, error, refetch } = useBookings(query);
  const gmailIntegration = useGmailMailIntegrationStatus();

  useEffect(() => {
    if (!gmailIntegration.isSuccess) return;
    if (gmailIntegration.data.connected) return;
    showGmailDisconnectedToast(() => navigate('/settings'));
  }, [gmailIntegration.isSuccess, gmailIntegration.data?.connected, navigate]);

  const patch = useCallback(
    (p: Partial<BookingsQuery>) =>
      setSearchParams((prev) => writeQueryToParams({ ...query, ...p }, prev), {
        replace: true,
      }),
    [query, setSearchParams],
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
          // Reset to first page when switching views; calendar in particular
          // benefits from seeing all results in the active range.
          sp.delete('page');
          return sp;
        },
        { replace: true },
      ),
    [setSearchParams],
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
  const startIdx = total === 0 ? 0 : (query.page - 1) * query.limit + 1;
  const endIdx = Math.min(total, startIdx + rows.length - 1);
  const pageItems = buildPageItems(query.page, pageCount);

  // Calendar view: fetch a higher cap so an entire month range can render.
  // We don't want pagination chopping a month view in half. The list-bookings
  // edge function caps `limit` at 100 — good enough for a single month at this
  // property's volume; widen later if needed via a cursor / infinite query.
  const showPagination = view !== 'calendar' && pageCount > 1;

  const showTableView = view === 'table' && !isMobileLayout;

  const handleStaySortChange = useCallback(
    (next: BookingsSort) => patch({ sort: next, page: 1 }),
    [patch],
  );

  const listSummaryProps = {
    isLoading,
    isFetching,
    total,
    startIdx,
    endIdx,
    rowsLength: rows.length,
    view,
  };

  const bookingActions = (
    <>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        aria-label="Refresh bookings"
        title="Refresh"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:opacity-40"
      >
        <RefreshCw
          className={cn('size-4', isFetching && 'animate-spin')}
          aria-hidden
        />
      </button>
      <Link
        to="/form"
        className={cn(
          'inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3 py-2 sm:px-3.5',
          'gradient-primary text-[13px] font-semibold text-primary-foreground shadow-soft',
          'transition-all duration-200 hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)] motion-safe:active:scale-[0.98]',
        )}
      >
        <CalendarPlus className="size-4" aria-hidden />
        <span className="hidden sm:inline">New booking</span>
      </Link>
    </>
  );

  return (
    <AdminLayout>
      <div className="space-y-3 sm:space-y-4">
        <section className="surface-card w-full px-3 py-3 sm:px-4 sm:py-4">
          <AdminPageHeader
            id="bookings-heading"
            variant="compact"
            title="Bookings"
            subtitle="Search, filter, and manage guest stays."
            icon={BookOpen}
            actions={bookingActions}
          />
        </section>
        <BookingFilters
          query={query}
          onChange={patch}
          onReset={resetFilters}
          sort={query.sort}
          onSortChange={handleStaySortChange}
          dateNav={dateNav}
          onClearDate={handleClearDate}
        />

        {/* Mobile — booking count directly under filters */}
        <div className="px-0.5 lg:hidden">
          <BookingsListSummary {...listSummaryProps} />
        </div>

        {/* Desktop — count + view + per page */}
        <div className="hidden flex-wrap items-center justify-between gap-2 px-0.5 lg:flex">
          <BookingsListSummary {...listSummaryProps} />

          <div className="flex items-center gap-2 sm:gap-3">
            <BookingViewToggle
              value={view}
              onChange={setView}
              hideTableView={isMobileLayout}
            />
            {view !== 'calendar' && (
              <label className="flex items-center gap-2 text-caption">
                <select
                  value={query.limit}
                  onChange={(e) =>
                    patch({ limit: Number(e.target.value), page: 1 })
                  }
                  aria-label="Items per page"
                  className="h-9 rounded-lg border border-sidebar-border bg-card px-2 text-ui font-semibold text-sidebar-foreground focus:border-sidebar-primary focus:outline-none focus:ring-2 focus:ring-sidebar-ring/20"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        {/* Mobile — sort, view, per page */}
        <div className="lg:hidden">
          <BookingsListControls
            view={view}
            onViewChange={setView}
            hideTableView={isMobileLayout}
            sort={query.sort}
            onSortChange={handleStaySortChange}
            limit={query.limit}
            onLimitChange={(limit) => patch({ limit, page: 1 })}
            showPerPage={view !== 'calendar'}
          />
        </div>

        {/* Active view */}
        {showTableView && (
          <BookingTable
            rows={rows}
            isLoading={isLoading}
            error={error ? (error as Error).message : null}
            isRefreshing={isFetching}
            sort={query.sort}
            onStaySortChange={handleStaySortChange}
          />
        )}
        {view === 'card' && (
          <BookingCardGrid
            rows={rows}
            isLoading={isLoading}
            error={error ? (error as Error).message : null}
            isRefreshing={isFetching}
          />
        )}
        {view === 'calendar' && (
          <BookingCalendarView
            rows={rows}
            isLoading={isLoading}
            error={error ? (error as Error).message : null}
            isRefreshing={isFetching}
            initialMonth={dateNav.dateRange.from}
          />
        )}

        {/* Pagination — hidden in calendar view (range already filters scope) */}
        {showPagination && (
          <BookingsListPagination
            page={query.page}
            pageCount={pageCount}
            pageItems={pageItems}
            isLoading={isLoading}
            onPageChange={(page) => patch({ page })}
          />
        )}
      </div>
    </AdminLayout>
  );
}
