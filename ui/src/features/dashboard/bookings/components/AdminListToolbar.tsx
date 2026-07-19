import { useEffect, type ReactNode } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADMIN_PAGE_SIZES, normalizeAdminPageLimit, type PageItem } from '@/lib/table/pagination';
import { cn } from '@/lib/utils';

type SummaryProps = {
  total: number;
  startIdx: number;
  endIdx: number;
  /** Plural noun after the count, e.g. "bookings", "stays", "lines". */
  entityLabel: string;
  isLoading?: boolean;
  isFetching?: boolean;
  emptyLabel?: string;
};

/** "1 – 8 of 8 bookings" — matches Bookings list meta row. */
export function AdminListSummary({
  total,
  startIdx,
  endIdx,
  entityLabel,
  isLoading = false,
  isFetching = false,
  emptyLabel,
}: SummaryProps) {
  const empty = emptyLabel ?? `No ${entityLabel.includes(' ') ? entityLabel : entityLabel}`;

  return (
    <p className="text-meta min-h-[20px]">
      {isLoading ? (
        <span className="bg-muted inline-block h-3 w-28 animate-pulse rounded-full" />
      ) : total === 0 ? (
        empty
      ) : (
        <>
          <span className="text-foreground font-bold">{startIdx.toLocaleString()}</span>
          <span className="text-muted-foreground/50 mx-1">–</span>
          <span className="text-foreground font-bold">{endIdx.toLocaleString()}</span>
          <span className="text-muted-foreground mx-1.5">of</span>
          <span className="text-foreground font-bold">{total.toLocaleString()}</span>
          <span className="text-muted-foreground ml-1.5">{entityLabel}</span>
          {isFetching && !isLoading && (
            <span className="text-muted-foreground/50 ml-2">· updating…</span>
          )}
        </>
      )}
    </p>
  );
}

type PerPageProps = {
  limit: number;
  onChange: (limit: number) => void;
};

export function AdminListPerPageSelect({ limit, onChange }: PerPageProps) {
  const pageSize = normalizeAdminPageLimit(limit);

  useEffect(() => {
    if (limit !== pageSize) onChange(pageSize);
  }, [limit, pageSize, onChange]);

  return (
    <Select value={String(pageSize)} onValueChange={(value) => onChange(Number(value))}>
      <SelectTrigger
        aria-label="Items per page"
        className={cn(
          'border-border bg-card h-10 min-h-[44px] w-auto min-w-[3.5rem] shrink-0 gap-1 rounded-lg py-2 pl-2.5 pr-1.5',
          'text-foreground text-[13px] font-semibold shadow-none',
          'hover:border-primary/40 hover:bg-muted/60',
          'focus-visible:border-primary/40 focus-visible:bg-background focus-visible:ring-ring/30 focus-visible:ring-2',
          'lg:h-9 lg:min-h-0'
        )}
      >
        <SelectValue className="min-w-[1.25rem] tabular-nums" />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[4.5rem] rounded-xl">
        {ADMIN_PAGE_SIZES.map((n) => (
          <SelectItem
            key={n}
            value={String(n)}
            className="rounded-lg py-2 pl-8 pr-2.5 text-[13px] font-semibold"
          >
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type PaginationProps = {
  page: number;
  pageCount: number;
  pageItems: PageItem[];
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  ariaLabel: string;
};

export function AdminListPagination({
  page,
  pageCount,
  pageItems,
  isLoading = false,
  onPageChange,
  ariaLabel,
}: PaginationProps) {
  return (
    <nav aria-label={ariaLabel} className="flex items-center justify-center gap-1 pt-2">
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
              className="text-caption flex size-10 shrink-0 select-none items-center justify-center lg:size-8"
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
                'text-ui flex size-10 shrink-0 items-center justify-center rounded-lg font-semibold transition-all duration-100 lg:size-8',
                item === page
                  ? 'segment-item-active'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item}
            </button>
          )
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
  children: ReactNode;
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
        'border-sidebar-border bg-card text-ui text-sidebar-muted border font-semibold',
        'transition-all duration-100',
        'hover:border-sidebar-primary/30 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-40'
      )}
    >
      {children}
    </button>
  );
}

type MetaBarProps = {
  summary: SummaryProps;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  showPerPage?: boolean;
  sortSlot?: ReactNode;
  actionsSlot?: ReactNode;
  /** Sort / per-page row shown under the summary on mobile only. */
  mobileToolbar?: ReactNode;
};

/** Desktop + mobile summary row above tables (Bookings / Finance). */
export function AdminListMetaBar({
  summary,
  limit,
  onLimitChange,
  showPerPage = true,
  sortSlot,
  actionsSlot,
  mobileToolbar,
}: MetaBarProps) {
  const perPage =
    showPerPage && limit != null && onLimitChange != null ? (
      <AdminListPerPageSelect limit={limit} onChange={onLimitChange} />
    ) : null;

  const mobileActions = mobileToolbar ?? actionsSlot;

  return (
    <>
      <div className="space-y-2.5 px-0.5 lg:hidden">
        <AdminListSummary {...summary} />
        {mobileActions ? (
          <div className="flex flex-wrap items-center justify-end gap-2">{mobileActions}</div>
        ) : null}
      </div>
      <div className="hidden flex-wrap items-center justify-between gap-2 px-0.5 lg:flex">
        <AdminListSummary {...summary} />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {sortSlot}
          {perPage}
          {actionsSlot}
        </div>
      </div>
    </>
  );
}
