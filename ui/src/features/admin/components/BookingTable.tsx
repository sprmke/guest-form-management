import { useNavigate } from 'react-router-dom';
import { BookingsTableSkeleton } from '@/components/skeletons/AdminSkeletons';
import { cn } from '@/lib/utils';
import {
  AdminDataTable,
  AdminTableFlagsCell,
  AdminTableGuestCell,
  AdminTableHeadRow,
  AdminTableRowAffordance,
  AdminTableStatusBadge,
  AdminTableTh,
  adminTableBodyText,
  adminTableCell,
  adminTableMoneyClass,
  adminTableRowClass,
} from '@/features/admin/components/AdminDataTable';
import { bookingListDisplayName } from '@/features/admin/lib/bookingListDisplay';
import { formatMoney } from '@/features/admin/lib/formatters';
import { BookingStayDatesCell } from '@/features/admin/components/BookingStayDatesCell';
import { BookingStaySortControl } from '@/features/admin/components/BookingStaySortControl';
import type { BookingRow, BookingsSort } from '@/features/admin/lib/types';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  sort: BookingsSort;
  onStaySortChange: (next: BookingsSort) => void;
  /** Shown under the default empty hint when the list has no rows. */
  emptyExtraHint?: string | null;
};

export function BookingTable({
  rows,
  isLoading,
  error,
  isRefreshing,
  sort,
  onStaySortChange,
  emptyExtraHint,
}: Props) {
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-base font-black leading-none text-destructive">
            !
          </span>
        </div>
        <div>
          <p className="text-section-title font-bold text-foreground">
            Could not load bookings
          </p>
          <p className="mt-1 max-w-xs text-caption">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <BookingsTableSkeleton />;

  if (rows.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
          <span className="text-lg leading-none text-muted-foreground">∅</span>
        </div>
        <div>
          <p className="text-section-title font-bold text-foreground">
            No bookings found
          </p>
          <p className="mt-1 text-caption">
            Adjust your filters or clear the search.
          </p>
          {emptyExtraHint ? (
            <p className="mt-2 max-w-sm text-caption">
              {emptyExtraHint}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <AdminDataTable
      minWidth={560}
      className={cn(
        'transition-opacity duration-300',
        isRefreshing && 'opacity-60',
      )}
    >
      <AdminTableHeadRow>
        <AdminTableTh className="pr-3 pl-4 sm:pl-5">Status</AdminTableTh>
        <AdminTableTh className="px-3 sm:px-4">Guest</AdminTableTh>
        <AdminTableTh className="px-3 sm:px-4">
          <BookingStaySortControl
            sort={sort}
            onChange={onStaySortChange}
            variant="header"
          />
        </AdminTableTh>
        <AdminTableTh className="hidden px-3 text-right sm:px-4 md:table-cell">
          Pax
        </AdminTableTh>
        <AdminTableTh className="hidden px-3 text-center sm:px-4 sm:table-cell">
          Flags
        </AdminTableTh>
        <AdminTableTh className="hidden px-3 text-right sm:px-4 lg:table-cell">
          Amount
        </AdminTableTh>
        <AdminTableTh className="pr-3 pl-2 text-right sm:pr-4 sm:pl-3">
          <span className="sr-only">View</span>
        </AdminTableTh>
      </AdminTableHeadRow>
      <tbody>
        {rows.map((row, i) => (
          <BookingTableRow
            key={row.id}
            row={row}
            index={i}
            onOpen={() => navigate(`/bookings/${row.id}`)}
          />
        ))}
      </tbody>
    </AdminDataTable>
  );
}

function BookingTableRow({
  row,
  index,
  onOpen,
}: {
  row: BookingRow;
  index: number;
  onOpen: () => void;
}) {
  const name = bookingListDisplayName(row);
  const pax = (row.number_of_adults ?? 0) + (row.number_of_children ?? 0);

  const handleKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      aria-label={`Open booking for ${name}`}
      className={adminTableRowClass(index)}
    >
      {/* Status */}
      <td className={adminTableCell.status}>
        <AdminTableStatusBadge status={row.status} />
      </td>

      <td className={adminTableCell.body}>
        <AdminTableGuestCell
          primary_guest_name={row.primary_guest_name}
          guest_facebook_name={row.guest_facebook_name}
          guest_email={row.guest_email}
          valid_id_url={row.valid_id_url}
        />
      </td>

      {/* Stay */}
      <td className={adminTableCell.body}>
        <BookingStayDatesCell
          checkInDate={row.check_in_date}
          checkOutDate={row.check_out_date}
          numberOfNights={row.number_of_nights}
        />
      </td>

      {/* Pax */}
      <td className={cn('hidden md:table-cell tabular-nums', adminTableCell.money)}>
        <span className={adminTableBodyText.secondary}>{pax}</span>
      </td>

      {/* Flags — bigger, more legible icons */}
      <td className={cn('hidden text-center sm:table-cell', adminTableCell.body)}>
        <AdminTableFlagsCell
          need_parking={row.need_parking}
          has_pets={row.has_pets}
          guest_requests_surprise_decor={row.guest_requests_surprise_decor}
        />
      </td>

      {/* Amount */}
      <td className={cn('hidden lg:table-cell', adminTableCell.money)}>
        <span
          className={adminTableMoneyClass(
            row.booking_rate == null ? 'text-muted-foreground/50' : undefined,
          )}
        >
          {formatMoney(row.booking_rate)}
        </span>
      </td>

      {/* Action — chevron only, click is handled by the whole row */}
      <td className={adminTableCell.action}>
        <AdminTableRowAffordance />
      </td>
    </tr>
  );
}
