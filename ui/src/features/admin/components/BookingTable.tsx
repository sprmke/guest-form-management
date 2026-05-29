import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Car, Dog, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { GuestAvatar } from '@/features/admin/components/GuestAvatar';
import {
  formatBookingDate,
  formatBookingDateShort,
  formatMoney,
} from '@/features/admin/lib/formatters';
import { bookingRequestsSurpriseDecor } from '@/features/admin/lib/bookingFlags';
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

  if (isLoading) return <TableSkeleton />;

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
    <div
      className={cn(
        'surface-card overflow-hidden transition-opacity duration-300',
        isRefreshing && 'opacity-60',
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              <Th className="pr-3 pl-4 sm:pl-5">Status</Th>
              <Th className="px-3 sm:px-4">Guest</Th>
              <Th className="px-3 sm:px-4">
                <BookingStaySortControl
                  sort={sort}
                  onChange={onStaySortChange}
                  variant="header"
                />
              </Th>
              <Th className="hidden px-3 text-right sm:px-4 md:table-cell">
                Pax
              </Th>
              <Th className="hidden px-3 text-center sm:px-4 sm:table-cell">
                Flags
              </Th>
              <Th className="hidden px-3 text-right sm:px-4 lg:table-cell">
                Amount
              </Th>
              <Th className="pr-3 pl-2 text-right sm:pr-4 sm:pl-3">
                <span className="sr-only">View</span>
              </Th>
            </tr>
          </thead>
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
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'py-3 text-left text-table-head',
        className,
      )}
    >
      {children}
    </th>
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
  const name =
    row.primary_guest_name ||
    row.guest_facebook_name ||
    row.guest_email ||
    'Guest';
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
      className={cn(
        'group cursor-pointer transition-colors duration-100 outline-none',
        'hover:bg-sidebar-accent/30 focus-visible:bg-sidebar-accent/40',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-primary/40',
        index > 0 && 'border-t border-border/40',
      )}
    >
      {/* Status */}
      <td className="pl-4 sm:pl-5 pr-3 py-3 sm:py-3.5 align-middle">
        <div className="inline-flex flex-col gap-1">
          <StatusBadge status={row.status} />
        </div>
      </td>

      {/* Guest — with avatar */}
      <td className="px-3 sm:px-4 py-3 sm:py-3.5 align-middle">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-[140px] sm:min-w-[160px]">
          <GuestAvatar name={name} validIdUrl={row.valid_id_url} size="md" />
          <div className="min-w-0">
            <p className="text-data-primary font-bold leading-tight truncate">
              {name}
            </p>
            <p className="mt-0.5 text-data-secondary truncate">
              {row.guest_email}
            </p>
          </div>
        </div>
      </td>

      {/* Stay */}
      <td className="px-3 sm:px-4 py-3 sm:py-3.5 align-middle whitespace-nowrap">
        <p className="text-data-primary">
          {formatBookingDateShort(row.check_in_date)}
          <span className="mx-1.5 font-light text-muted-foreground/50">→</span>
          {formatBookingDate(row.check_out_date)}
        </p>
        <p className="mt-0.5 text-data-secondary">
          {row.number_of_nights}{' '}
          {row.number_of_nights === 1 ? 'night' : 'nights'}
        </p>
      </td>

      {/* Pax */}
      <td className="hidden px-3 sm:px-4 py-3.5 text-right align-middle tabular-nums md:table-cell">
        <span className="text-data-primary text-muted-foreground">{pax}</span>
      </td>

      {/* Flags — bigger, more legible icons */}
      <td className="hidden px-3 sm:px-4 py-3.5 text-center align-middle sm:table-cell">
        <div className="inline-flex gap-1.5 justify-center items-center">
          {row.need_parking && (
            <span
              title="Needs parking"
              aria-label="Needs parking"
              className="inline-flex items-center justify-center size-7 rounded-md bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70"
            >
              <Car className="size-4" aria-hidden />
            </span>
          )}
          {row.has_pets && (
            <span
              title="Has pets"
              aria-label="Has pets"
              className="inline-flex items-center justify-center size-7 rounded-md bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70"
            >
              <Dog className="size-4" aria-hidden />
            </span>
          )}
          {bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) && (
            <span
              title="Surprise decor setup"
              aria-label="Surprise decor setup"
              className="inline-flex items-center justify-center size-7 rounded-md bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200/70"
            >
              <PartyPopper className="size-4" aria-hidden />
            </span>
          )}
          {!row.need_parking &&
            !row.has_pets &&
            !bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) && (
            <span className="text-muted-foreground/40 text-[14px] leading-none">—</span>
          )}
        </div>
      </td>

      {/* Amount */}
      <td className="hidden px-3 sm:px-4 py-3.5 text-right align-middle lg:table-cell">
        <span
          className={cn(
            'text-table-amount',
            row.booking_rate == null && 'text-muted-foreground/50',
          )}
        >
          {formatMoney(row.booking_rate)}
        </span>
      </td>

      {/* Action — chevron only, click is handled by the whole row */}
      <td className="py-2 pr-3 pl-2 text-right align-middle sm:pr-4">
        <span
          aria-hidden
          className={cn(
            'inline-flex items-center justify-center rounded-lg',
            'min-w-[44px] min-h-[44px] text-muted-foreground',
            'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100',
            'transition-opacity duration-150',
          )}
        >
          <ArrowUpRight className="size-4" />
        </span>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-6 border-b border-border/60 bg-muted/40 px-5 py-[11px]">
        {[72, 120, 150, 48, 60, 72].map((w, i) => (
          <div
            key={i}
            className="h-2.5 rounded-full bg-muted animate-pulse shrink-0"
            style={{ width: w, opacity: 0.6 }}
          />
        ))}
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-4 px-5 py-4',
            i > 0 && 'border-t border-border/40',
          )}
          style={{ opacity: 1 - i * 0.1 }}
        >
          <div className="w-24 h-5 rounded-md animate-pulse bg-muted" />
          <div className="flex flex-1 gap-3 items-center">
            <div className="rounded-full animate-pulse size-9 bg-muted shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="w-32 h-3 rounded-full animate-pulse bg-muted" />
              <div className="h-2.5 rounded-full bg-muted/70 animate-pulse w-40" />
            </div>
          </div>
          <div className="hidden w-36 h-3 rounded-full animate-pulse md:block bg-muted" />
          <div className="ml-auto w-14 h-7 rounded-lg animate-pulse bg-muted" />
        </div>
      ))}
    </div>
  );
}
