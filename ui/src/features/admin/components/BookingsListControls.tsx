import { BookingsSortMenu } from "@/features/admin/components/BookingsSortMenu";
import {
  BookingViewToggle,
  type BookingView,
} from "@/features/admin/components/BookingViewToggle";
import {
  AdminListPagination,
  AdminListPerPageSelect,
  AdminListSummary,
} from "@/features/admin/components/AdminListToolbar";
import type { BookingsSort } from "@/features/admin/lib/types";

import type { ComponentProps } from "react";

type BookingsPaginationProps = Omit<
  ComponentProps<typeof AdminListPagination>,
  "ariaLabel"
>;

export function BookingsListPagination(props: BookingsPaginationProps) {
  return <AdminListPagination ariaLabel="Bookings pagination" {...props} />;
}

type SummaryProps = {
  isLoading: boolean;
  isFetching: boolean;
  total: number;
  startIdx: number;
  endIdx: number;
  rowsLength: number;
  view: BookingView;
};

/** "1 – 4 of 4 bookings" — calendar view uses a different count line. */
export function BookingsListSummary({
  isLoading,
  isFetching,
  total,
  startIdx,
  endIdx,
  rowsLength,
  view,
}: SummaryProps) {
  if (view === "calendar") {
    return (
      <p className="text-meta min-h-[20px]">
        {isLoading ? (
          <span className="inline-block h-3 w-28 animate-pulse rounded-full bg-muted" />
        ) : total === 0 ? (
          "No bookings found"
        ) : (
          <>
            <span className="font-bold text-foreground">
              {rowsLength.toLocaleString()}
            </span>
            <span className="ml-1.5 text-muted-foreground">
              {rowsLength === 1 ? "booking" : "bookings"} in view
            </span>
            {total > rowsLength && (
              <span className="ml-1.5 text-muted-foreground/50">
                {" "}
                of {total.toLocaleString()}
              </span>
            )}
            {isFetching && !isLoading && (
              <span className="ml-2 text-muted-foreground/50">· updating…</span>
            )}
          </>
        )}
      </p>
    );
  }

  return (
    <AdminListSummary
      total={total}
      startIdx={startIdx}
      endIdx={endIdx}
      entityLabel={total === 1 ? "booking" : "bookings"}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyLabel="No bookings found"
    />
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

        {showPerPage && view !== "calendar" && (
          <AdminListPerPageSelect limit={limit} onChange={onLimitChange} />
        )}
      </div>
    </div>
  );
}
