import { useMemo, useState } from 'react';
import { BedDouble } from 'lucide-react';
import {
  FinanceStaysCardGridSkeleton,
  FinanceStaysTableSkeleton,
} from '@/components/skeletons/AdminSkeletons';
import {
  AdminListMetaBar,
  AdminListPagination,
  AdminListPerPageSelect,
  buildPageItems,
} from '@/features/admin/components/AdminListToolbar';
import {
  AdminDataTable,
  AdminTableFlagsCell,
  AdminTableGuestCell,
  AdminTableHeadRow,
  AdminTableRowLink,
  AdminTableStatusBadge,
  AdminTableTh,
  adminTableCell,
  adminTableMoneyClass,
  adminTableRowClass,
} from '@/features/admin/components/AdminDataTable';
import { financeDisplayNet, hostNetToneClass } from '@/features/admin/lib/bookingFinance';
import { bookingListDisplayName } from '@/features/admin/lib/bookingListDisplay';
import { formatMoney } from '@/features/admin/lib/formatters';
import { BookingStayDatesCell } from '@/features/admin/components/BookingStayDatesCell';
import { FinanceStaysCardGrid } from '@/features/finance/components/FinanceStaysCardGrid';
import { FinanceStaysCalendarView } from '@/features/finance/components/FinanceStaysCalendarView';
import { FinanceStaysSortMenu } from '@/features/finance/components/FinanceStaysSortMenu';
import { FinanceStaysViewToggle } from '@/features/finance/components/FinanceStaysViewToggle';
import { StayFinanceModal } from '@/features/finance/components/StayFinanceModal';
import type { FinanceBookingLedgerRow, FinanceQuery } from '@/features/finance/lib/types';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type Props = {
  query: FinanceQuery;
  rows: FinanceBookingLedgerRow[];
  total: number;
  isLoading: boolean;
  isFetching?: boolean;
  error?: string | null;
  calendarInitialMonth?: Date;
  onCalendarMonthChange?: (month: Date) => void;
  onQueryChange: (next: FinanceQuery) => void;
};

export function FinanceStaysTab({
  query,
  rows,
  total,
  isLoading,
  isFetching = false,
  error = null,
  calendarInitialMonth,
  onCalendarMonthChange,
  onQueryChange,
}: Props) {
  const isMobileLayout = useIsBelowLg();
  const [drawerRow, setDrawerRow] = useState<FinanceBookingLedgerRow | null>(
    null,
  );
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const startIdx = total === 0 ? 0 : (query.page - 1) * query.limit + 1;
  const endIdx = Math.min(total, startIdx + rows.length - 1);
  const pageItems = useMemo(
    () => buildPageItems(query.page, pageCount),
    [query.page, pageCount],
  );
  const showCalendarView = query.staysView === 'calendar';
  const showTableView = query.staysView === 'table' && !isMobileLayout;
  const showCardView =
    query.staysView === 'card' ||
    (isMobileLayout && query.staysView !== 'calendar');
  const showPagination = !showCalendarView && pageCount > 1;

  const handleViewChange = (staysView: FinanceQuery['staysView']) => {
    onQueryChange({ ...query, staysView, page: 1 });
  };

  if (isLoading && rows.length === 0 && !showCalendarView) {
    return showCardView ? (
      <FinanceStaysCardGridSkeleton />
    ) : (
      <FinanceStaysTableSkeleton />
    );
  }

  if (showCalendarView) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <p className="text-[12px] font-medium text-muted-foreground tabular-nums">
            {total === 0
              ? 'No stays in this period'
              : `${total} ${total === 1 ? 'stay' : 'stays'} in period`}
          </p>
          <FinanceStaysViewToggle
            value={query.staysView}
            onChange={handleViewChange}
            hideTableView={isMobileLayout}
          />
        </div>

        <FinanceStaysCalendarView
          rows={rows}
          isLoading={isLoading}
          error={error}
          isRefreshing={isFetching}
          initialMonth={calendarInitialMonth}
          onMonthChange={onCalendarMonthChange}
          onOpenRow={setDrawerRow}
        />

        <StayFinanceModal
          row={drawerRow}
          onClose={() => setDrawerRow(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AdminListMetaBar
        summary={{
          total,
          startIdx,
          endIdx,
          entityLabel: total === 1 ? 'stay' : 'stays',
          isLoading,
          isFetching,
          emptyLabel: 'No stays in this period',
        }}
        limit={query.limit}
        onLimitChange={(limit) => onQueryChange({ ...query, limit, page: 1 })}
        sortSlot={
          <FinanceStaysSortMenu
            sort={query.sort}
            onChange={(sort) => onQueryChange({ ...query, sort, page: 1 })}
          />
        }
        actionsSlot={
          <FinanceStaysViewToggle
            value={query.staysView}
            onChange={handleViewChange}
            hideTableView={isMobileLayout}
          />
        }
        mobileToolbar={
          <div className="flex flex-col gap-2.5">
            <FinanceStaysSortMenu
              sort={query.sort}
              onChange={(sort) => onQueryChange({ ...query, sort, page: 1 })}
              fullWidth
            />
            <div className="flex items-center justify-between gap-3">
              <FinanceStaysViewToggle
                value={query.staysView}
                onChange={handleViewChange}
                hideTableView={isMobileLayout}
              />
              <AdminListPerPageSelect
                limit={query.limit}
                onChange={(limit) =>
                  onQueryChange({ ...query, limit, page: 1 })
                }
              />
            </div>
          </div>
        }
      />

      {showTableView ? (
        <AdminDataTable minWidth={680}>
          <AdminTableHeadRow>
            <AdminTableTh className="pr-3 pl-4 sm:pl-5">Status</AdminTableTh>
            <AdminTableTh className="px-3 sm:px-4">Guest</AdminTableTh>
            <AdminTableTh className="hidden px-3 md:table-cell sm:px-4">
              Stay
            </AdminTableTh>
            <AdminTableTh className="hidden px-3 text-center sm:table-cell sm:px-4">
              Flags
            </AdminTableTh>
            <AdminTableTh className="hidden text-right lg:table-cell">
              Booking rate
            </AdminTableTh>
            <AdminTableTh className="text-right">Other fees</AdminTableTh>
            <AdminTableTh className="text-right">Host net</AdminTableTh>
            <AdminTableTh className="pr-3 pl-2 text-right sm:pr-4 sm:pl-3">
              <span className="sr-only">View</span>
            </AdminTableTh>
          </AdminTableHeadRow>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <div className="icon-well-sm bg-muted/80">
                      <BedDouble
                        className="size-[18px] text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                    <div>
                      <p className="text-section-title font-bold text-foreground">
                        No stays in this period
                      </p>
                      <p className="mt-1 text-caption">
                        Adjust dates or remove filters to see results.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const fin = row.financials;
                const netDisplay = financeDisplayNet(fin);
                const isRealized = fin.isCompleted;
                const name = bookingListDisplayName(row);

                const handleKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDrawerRow(row);
                  }
                };

                return (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open finance details for ${name}`}
                    className={adminTableRowClass(index)}
                    onClick={() => setDrawerRow(row)}
                    onKeyDown={handleKey}
                  >
                    <td className={adminTableCell.status}>
                      <AdminTableStatusBadge status={row.status} />
                    </td>
                    <td className={adminTableCell.body}>
                      <AdminTableGuestCell
                        primary_guest_name={row.primary_guest_name}
                        guest_facebook_name={row.guest_facebook_name}
                        guest_email={row.guest_email}
                        valid_id_url={row.valid_id_url}
                        mobileExtra={
                          <BookingStayDatesCell
                            checkInDate={row.check_in_date}
                            checkOutDate={row.check_out_date}
                            numberOfNights={row.number_of_nights}
                          />
                        }
                      />
                    </td>
                    <td
                      className={cn(
                        'hidden md:table-cell',
                        adminTableCell.body,
                      )}
                    >
                      <BookingStayDatesCell
                        checkInDate={row.check_in_date}
                        checkOutDate={row.check_out_date}
                        numberOfNights={row.number_of_nights}
                      />
                    </td>
                    <td
                      className={cn(
                        'hidden text-center sm:table-cell',
                        adminTableCell.body,
                      )}
                    >
                      <AdminTableFlagsCell
                        need_parking={row.need_parking}
                        has_pets={row.has_pets}
                        guest_requests_surprise_decor={
                          row.guest_requests_surprise_decor
                        }
                      />
                    </td>
                    <td
                      className={cn('hidden lg:table-cell', adminTableCell.money)}
                    >
                      <span className={adminTableMoneyClass()}>
                        {formatMoney(fin.bookingRate)}
                      </span>
                    </td>
                    <td className={adminTableCell.money}>
                      <span className={adminTableMoneyClass()}>
                        {formatMoney(fin.otherFees)}
                      </span>
                    </td>
                    <td className={adminTableCell.money}>
                      <span
                        className={adminTableMoneyClass(
                          hostNetToneClass(netDisplay, isRealized),
                        )}
                      >
                        {formatMoney(netDisplay)}
                      </span>
                      {!isRealized && netDisplay != null ? (
                        <span className="ml-1 align-middle text-[10px] font-medium uppercase tracking-wide text-amber-600/90 dark:text-amber-400/90">
                          est
                        </span>
                      ) : null}
                    </td>
                    <td className={adminTableCell.action}>
                      <AdminTableRowLink
                        to={`/bookings/${row.id}`}
                        ariaLabel={`Open booking for ${name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </AdminDataTable>
      ) : null}

      {showCardView ? (
        <FinanceStaysCardGrid
          rows={rows}
          isLoading={isLoading}
          isRefreshing={isFetching}
          onOpenRow={setDrawerRow}
        />
      ) : null}

      {showPagination ? (
        <AdminListPagination
          page={query.page}
          pageCount={pageCount}
          pageItems={pageItems}
          isLoading={isLoading}
          onPageChange={(page) => onQueryChange({ ...query, page })}
          ariaLabel="Finance stays pagination"
        />
      ) : null}

      <StayFinanceModal
        row={drawerRow}
        onClose={() => setDrawerRow(null)}
      />
    </div>
  );
}
