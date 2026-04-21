import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminSession } from '@/features/admin/hooks/useAdminSession';
import { useBookings } from '@/features/admin/hooks/useBookings';
import { BookingFilters } from '@/features/admin/components/BookingFilters';
import { BookingTable } from '@/features/admin/components/BookingTable';
import {
  DEFAULT_BOOKINGS_QUERY,
  type BookingsQuery,
  type BookingsSort,
} from '@/features/admin/lib/types';

const PAGE_SIZES = [25, 50, 100] as const;

function parseQueryFromParams(sp: URLSearchParams): BookingsQuery {
  const statusRaw = sp.get('status') ?? '';
  const statuses = statusRaw.split(',').map((s) => s.trim()).filter(Boolean);

  const parseTri = (value: string | null): boolean | null => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  };

  const page = Number(sp.get('page') ?? '1');
  const limit = Number(sp.get('limit') ?? String(DEFAULT_BOOKINGS_QUERY.limit));

  const sortParam = (sp.get('sort') ?? DEFAULT_BOOKINGS_QUERY.sort) as BookingsSort;
  const sort: BookingsSort =
    sortParam === 'created_at:asc' || sortParam === 'created_at:desc'
      ? sortParam
      : DEFAULT_BOOKINGS_QUERY.sort;

  return {
    q: sp.get('q') ?? '',
    status: statuses,
    from: sp.get('from'),
    to: sp.get('to'),
    hasPets: parseTri(sp.get('hasPets')),
    needParking: parseTri(sp.get('needParking')),
    includeTests: sp.get('includeTests') === 'true',
    sort,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit:
      (PAGE_SIZES as ReadonlyArray<number>).includes(limit) === true
        ? limit
        : DEFAULT_BOOKINGS_QUERY.limit,
  };
}

function writeQueryToParams(query: BookingsQuery, current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  const set = (key: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, value);
  };

  set('q', query.q);
  set('status', query.status.length ? query.status.join(',') : null);
  set('from', query.from);
  set('to', query.to);
  set('hasPets', query.hasPets === null ? null : String(query.hasPets));
  set('needParking', query.needParking === null ? null : String(query.needParking));
  set('includeTests', query.includeTests ? 'true' : null);
  set('sort', query.sort === DEFAULT_BOOKINGS_QUERY.sort ? null : query.sort);
  set('page', query.page === 1 ? null : String(query.page));
  set('limit', query.limit === DEFAULT_BOOKINGS_QUERY.limit ? null : String(query.limit));

  return next;
}

export function BookingsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseQueryFromParams(searchParams), [searchParams]);

  const { email, signOut } = useAdminSession();
  const { data, isLoading, isFetching, error, refetch } = useBookings(query);

  const patchQuery = useCallback(
    (patch: Partial<BookingsQuery>) => {
      setSearchParams(
        (prev) => writeQueryToParams({ ...query, ...patch }, prev),
        { replace: true },
      );
    },
    [query, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const total = data?.total ?? 0;
  const rows = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const startIndex = total === 0 ? 0 : (query.page - 1) * query.limit + 1;
  const endIndex = Math.min(total, startIndex + rows.length - 1);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <header className="sticky top-0 z-20 border-b backdrop-blur border-border/60 bg-background/80">
        <div className="flex gap-3 justify-between items-center px-4 py-3 mx-auto max-w-6xl sm:px-6">
          <div className="min-w-0">
            <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
              Kame Home · Admin
            </div>
            <h1 className="text-lg font-semibold tracking-tight truncate text-foreground sm:text-xl">
              Bookings
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex"
            >
              <Link to="/form">
                <CalendarPlus className="mr-1.5 size-4" aria-hidden />
                New booking
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              aria-label="Refresh"
              title="Refresh"
              disabled={isFetching}
            >
              <RefreshCw
                className={isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden
              />
            </Button>
            <div className="hidden gap-2 items-center sm:flex">
              <div className="text-xs text-right">
                <div className="font-medium text-foreground truncate max-w-[180px]">
                  {email ?? 'Admin'}
                </div>
                <div className="text-[11px] text-muted-foreground">Signed in</div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await signOut();
                }}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 py-6 mx-auto space-y-4 max-w-6xl sm:px-6 sm:py-8">
        <BookingFilters query={query} onChange={patchQuery} onReset={resetFilters} />

        <div className="flex flex-wrap gap-2 justify-between items-center px-1">
          <div className="text-xs text-muted-foreground">
            {isLoading
              ? 'Loading bookings…'
              : total === 0
                ? 'No bookings'
                : `Showing ${startIndex.toLocaleString()}–${endIndex.toLocaleString()} of ${total.toLocaleString()}`}
            {isFetching && !isLoading ? ' · updating…' : null}
          </div>
          <div className="flex gap-2 items-center">
            <label className="flex gap-1.5 items-center text-xs text-muted-foreground">
              <span>Per page</span>
              <select
                value={query.limit}
                onChange={(e) =>
                  patchQuery({ limit: Number(e.target.value), page: 1 })
                }
                className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <BookingTable
          rows={rows}
          isLoading={isLoading}
          error={error ? (error as Error).message : null}
          isRefreshing={isFetching}
        />

        {pageCount > 1 && (
          <div className="flex justify-between items-center px-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => patchQuery({ page: Math.max(1, query.page - 1) })}
              disabled={query.page <= 1 || isLoading}
            >
              <ChevronLeft className="mr-1 size-4" aria-hidden />
              Previous
            </Button>
            <div className="text-xs tabular-nums text-muted-foreground">
              Page {query.page.toLocaleString()} of {pageCount.toLocaleString()}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => patchQuery({ page: Math.min(pageCount, query.page + 1) })}
              disabled={query.page >= pageCount || isLoading}
            >
              Next
              <ChevronRight className="ml-1 size-4" aria-hidden />
            </Button>
          </div>
        )}

        <p className="pt-4 text-[11px] leading-relaxed text-muted-foreground">
          Phase 1 · read-only view. Admin transitions, detail view, and server-side date sorting
          arrive in Phase 3. See <code className="font-mono">docs/NEW_FLOW_PLAN.md</code> §5.
        </p>
      </section>
    </main>
  );
}
