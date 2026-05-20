import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingsSortMenu } from '@/features/admin/components/BookingsSortMenu';
import {
  BookingViewToggle,
  type BookingView,
} from '@/features/admin/components/BookingViewToggle';
import type { BookingsSort } from '@/features/admin/lib/types';

const PAGE_SIZES = [25, 50, 100] as const;

type SummaryProps = {
  isLoading: boolean;
  isFetching: boolean;
  total: number;
  startIdx: number;
  endIdx: number;
  rowsLength: number;
  view: BookingView;
};

/** "1 – 4 of 4 bookings" line — shared by desktop meta row and mobile header. */
export function BookingsListSummary({
  isLoading,
  isFetching,
  total,
  startIdx,
  endIdx,
  rowsLength,
  view,
}: SummaryProps) {
  return (
    <p className="min-h-[20px] text-[13px] leading-snug text-slate-500">
      {isLoading ? (
        <span className="inline-block h-3 w-28 animate-pulse rounded-full bg-slate-200" />
      ) : total === 0 ? (
        'No bookings found'
      ) : view === 'calendar' ? (
        <>
          <span className="font-bold text-slate-700">
            {rowsLength.toLocaleString()}
          </span>
          <span className="ml-1.5 text-slate-400">
            {rowsLength === 1 ? 'booking' : 'bookings'} in view
          </span>
          {total > rowsLength && (
            <span className="ml-1.5 text-slate-300">
              {' '}
              of {total.toLocaleString()}
            </span>
          )}
          {isFetching && !isLoading && (
            <span className="ml-2 text-slate-300">· updating…</span>
          )}
        </>
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
  );
}

type Props = {
  view: BookingView;
  onViewChange: (view: BookingView) => void;
  hideTableView?: boolean;
  sort: BookingsSort;
  onSortChange: (sort: BookingsSort) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  showPerPage?: boolean;
};

/**
 * Mobile-only toolbar: sort, view mode, page size (desktop uses the filter bar + meta row).
 */
export function BookingsListControls({
  view,
  onViewChange,
  hideTableView = false,
  sort,
  onSortChange,
  limit,
  onLimitChange,
  showPerPage = true,
}: Props) {
  return (
    <div className="space-y-2.5 px-0.5">
      <BookingsSortMenu sort={sort} onChange={onSortChange} fullWidth />

      <div className="flex items-center justify-between gap-3">
        <BookingViewToggle
          value={view}
          onChange={onViewChange}
          hideTableView={hideTableView}
        />

        {showPerPage && view !== 'calendar' && (
          <label className="flex shrink-0 items-center gap-2 text-[12px] text-slate-500">
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Items per page"
              className="h-10 min-h-[44px] rounded-lg border border-sidebar-border bg-white px-2.5 text-[12px] font-semibold text-sidebar-foreground focus:border-sidebar-primary focus:outline-none focus:ring-2 focus:ring-sidebar-ring/20"
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
  );
}

type PaginationProps = {
  page: number;
  pageCount: number;
  pageItems: Array<number | 'ellipsis'>;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

export function BookingsListPagination({
  page,
  pageCount,
  pageItems,
  isLoading,
  onPageChange,
}: PaginationProps) {
  return (
    <nav
      aria-label="Bookings pagination"
      className="flex items-center justify-center gap-1 pt-2"
    >
      <PaginationBtn
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1 || isLoading}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" aria-hidden />
        <span className="hidden sm:inline">Prev</span>
      </PaginationBtn>

      <div className="flex max-w-[min(100%,240px)] items-center gap-0.5 overflow-x-auto px-0.5 sm:max-w-none">
        {pageItems.map((item, idx) =>
          item === 'ellipsis' ? (
            <span
              key={`dots-${idx}`}
              className="flex size-10 shrink-0 items-center justify-center text-[12px] text-slate-400 select-none lg:size-8"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-label={`Go to page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold transition-all duration-100 lg:size-8 lg:text-[12px]',
                item === page
                  ? 'text-sidebar-primary-foreground'
                  : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
              style={
                item === page
                  ? {
                      background: 'hsl(var(--sidebar-primary))',
                      boxShadow:
                        '0 1px 4px hsl(var(--sidebar-primary) / 0.3)',
                    }
                  : undefined
              }
            >
              {item}
            </button>
          ),
        )}
      </div>

      <PaginationBtn
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page >= pageCount || isLoading}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden />
      </PaginationBtn>
    </nav>
  );
}

function PaginationBtn({
  children,
  onClick,
  disabled,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  'aria-label': string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-lg px-3',
        'lg:min-h-0 lg:min-w-0 lg:px-3 lg:py-1.5',
        'border border-sidebar-border bg-white text-[12px] font-semibold text-sidebar-muted',
        'transition-all duration-100',
        'hover:border-sidebar-primary/30 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}
