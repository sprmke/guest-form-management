import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { useBookings } from "@/features/admin/hooks/useBookings";
import { BookingFilters } from "@/features/admin/components/BookingFilters";
import { BookingTable } from "@/features/admin/components/BookingTable";
import {
  DEFAULT_BOOKINGS_QUERY,
  type BookingsQuery,
  type BookingsSort,
} from "@/features/admin/lib/types";

const PAGE_SIZES = [25, 50, 100] as const;

// ─── URL ↔ query helpers ─────────────────────────────────────

function parseQueryFromParams(sp: URLSearchParams): BookingsQuery {
  const statuses = (sp.get("status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const parseTri = (v: string | null): boolean | null =>
    v === "true" ? true : v === "false" ? false : null;
  const page = Number(sp.get("page") ?? "1");
  const limit = Number(sp.get("limit") ?? String(DEFAULT_BOOKINGS_QUERY.limit));
  const sortParam = (sp.get("sort") ??
    DEFAULT_BOOKINGS_QUERY.sort) as BookingsSort;
  const sort: BookingsSort =
    sortParam === "created_at:asc" || sortParam === "created_at:desc"
      ? sortParam
      : DEFAULT_BOOKINGS_QUERY.sort;
  return {
    q: sp.get("q") ?? "",
    status: statuses,
    from: sp.get("from"),
    to: sp.get("to"),
    hasPets: parseTri(sp.get("hasPets")),
    needParking: parseTri(sp.get("needParking")),
    includeTests: sp.get("includeTests") === "true",
    sort,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit: (PAGE_SIZES as ReadonlyArray<number>).includes(limit)
      ? limit
      : DEFAULT_BOOKINGS_QUERY.limit,
  };
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
  set("q", q.q);
  set("status", q.status.length ? q.status.join(",") : null);
  set("from", q.from);
  set("to", q.to);
  set("hasPets", q.hasPets === null ? null : String(q.hasPets));
  set("needParking", q.needParking === null ? null : String(q.needParking));
  set("includeTests", q.includeTests ? "true" : null);
  set("sort", q.sort === DEFAULT_BOOKINGS_QUERY.sort ? null : q.sort);
  set("page", q.page === 1 ? null : String(q.page));
  set(
    "limit",
    q.limit === DEFAULT_BOOKINGS_QUERY.limit ? null : String(q.limit),
  );
  return next;
}

// ─── Smart page number builder ───────────────────────────────

type PageItem = number | "ellipsis";

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: PageItem[] = [1];

  if (current > 3) items.push("ellipsis");

  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  for (let p = lo; p <= hi; p++) items.push(p);

  if (current < total - 2) items.push("ellipsis");

  items.push(total);
  return items;
}

// ─── Page component ──────────────────────────────────────────

export function BookingsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(
    () => parseQueryFromParams(searchParams),
    [searchParams],
  );
  const { data, isLoading, isFetching, error, refetch } = useBookings(query);

  const patch = useCallback(
    (p: Partial<BookingsQuery>) =>
      setSearchParams((prev) => writeQueryToParams({ ...query, ...p }, prev), {
        replace: true,
      }),
    [query, setSearchParams],
  );

  const resetFilters = useCallback(
    () => setSearchParams(new URLSearchParams(), { replace: true }),
    [setSearchParams],
  );

  const total = data?.total ?? 0;
  const rows = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const startIdx = total === 0 ? 0 : (query.page - 1) * query.limit + 1;
  const endIdx = Math.min(total, startIdx + rows.length - 1);
  const pageItems = buildPageItems(query.page, pageCount);

  return (
    <AdminLayout
      title="Bookings"
      actions={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh bookings"
            title="Refresh"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent disabled:opacity-40 transition-colors"
          >
            <RefreshCw
              className={cn("size-4", isFetching && "animate-spin")}
              aria-hidden
            />
          </button>
          <Link
            to="/form"
            className={cn(
              "inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg min-h-[44px]",
              "text-[13px] font-semibold text-white",
              "transition-all duration-150",
              "hover:opacity-90 active:scale-[0.98]",
            )}
            style={{
              background: "hsl(var(--sidebar-primary))",
              boxShadow: "0 1px 3px hsl(var(--sidebar-primary) / 0.35)",
            }}
          >
            <CalendarPlus className="size-4" aria-hidden />
            {/* Text hidden on very small screens to save topbar space */}
            <span className="hidden sm:inline">New booking</span>
          </Link>
        </div>
      }
    >
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        {/* Filters */}
        <BookingFilters query={query} onChange={patch} onReset={resetFilters} />

        {/* Meta bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <p className="text-[13px] text-slate-500">
            {isLoading ? (
              <span className="inline-block w-28 h-3 rounded-full bg-slate-200 animate-pulse" />
            ) : total === 0 ? (
              "No bookings found"
            ) : (
              <>
                <span className="font-bold text-slate-700">
                  {startIdx.toLocaleString()}
                </span>
                <span className="mx-1 text-slate-300">–</span>
                <span className="font-bold text-slate-700">
                  {endIdx.toLocaleString()}
                </span>
                <span className="mx-1.5 text-slate-400">of</span>
                <span className="font-bold text-slate-700">
                  {total.toLocaleString()}
                </span>
                <span className="ml-1.5 text-slate-400">bookings</span>
                {isFetching && !isLoading && (
                  <span className="ml-2 text-slate-300">· updating…</span>
                )}
              </>
            )}
          </p>

          <label className="flex items-center gap-2 text-[12px] text-slate-500">
            <span>Per page</span>
            <select
              value={query.limit}
              onChange={(e) =>
                patch({ limit: Number(e.target.value), page: 1 })
              }
              className="h-7 rounded-lg border border-sidebar-border bg-white px-2 text-[12px] font-semibold text-sidebar-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring/20 focus:border-sidebar-primary"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Table */}
        <BookingTable
          rows={rows}
          isLoading={isLoading}
          error={error ? (error as Error).message : null}
          isRefreshing={isFetching}
        />

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-1 pt-1">
            {/* Prev */}
            <PaginationBtn
              onClick={() => patch({ page: Math.max(1, query.page - 1) })}
              disabled={query.page <= 1 || isLoading}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Prev</span>
            </PaginationBtn>

            {/* Page chips */}
            <div className="flex items-center gap-0.5">
              {pageItems.map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`dots-${idx}`}
                    className="w-8 text-center text-[12px] text-slate-400 select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => patch({ page: item })}
                    aria-label={`Go to page ${item}`}
                    aria-current={item === query.page ? "page" : undefined}
                    className={cn(
                      "size-8 rounded-lg text-[13px] font-semibold transition-all duration-100",
                      item === query.page
                        ? "text-sidebar-primary-foreground"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                    style={
                      item === query.page
                        ? {
                            background: "hsl(var(--sidebar-primary))",
                            boxShadow:
                              "0 1px 4px hsl(var(--sidebar-primary) / 0.3)",
                          }
                        : undefined
                    }
                  >
                    {item}
                  </button>
                ),
              )}
            </div>

            {/* Next */}
            <PaginationBtn
              onClick={() =>
                patch({ page: Math.min(pageCount, query.page + 1) })
              }
              disabled={query.page >= pageCount || isLoading}
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-3.5" aria-hidden />
            </PaginationBtn>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Shared pagination button ────────────────────────────────

function PaginationBtn({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold",
        "border border-sidebar-border bg-white text-sidebar-muted",
        "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:border-sidebar-primary/30",
        "transition-all duration-100",
        "disabled:opacity-40 disabled:pointer-events-none",
      )}
    >
      {children}
    </button>
  );
}
