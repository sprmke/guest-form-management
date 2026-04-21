import { Link } from 'react-router-dom';
import { Car, Dog, ExternalLink, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import {
  formatBookingDate,
  formatBookingDateShort,
  formatMoney,
  formatRelative,
} from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
};

export function BookingTable({ rows, isLoading, error, isRefreshing }: Props) {
  if (error) {
    return (
      <div className="p-8 rounded-2xl border bg-card border-border/60">
        <p className="text-sm font-medium text-destructive">Failed to load bookings.</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border bg-card border-border/60">
        <p className="text-sm font-medium text-foreground">No bookings match these filters.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try clearing the search, expanding the status chips, or enabling test bookings.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border shadow-soft bg-card border-border/60',
        isRefreshing && 'opacity-80 transition-opacity',
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-muted-foreground bg-muted/40 border-border/60">
            <tr>
              <th scope="col" className="py-3 pr-3 pl-4 font-medium text-left">Status</th>
              <th scope="col" className="py-3 px-3 font-medium text-left">Guest</th>
              <th scope="col" className="py-3 px-3 font-medium text-left">Stay</th>
              <th scope="col" className="hidden py-3 px-3 font-medium text-right md:table-cell">Pax</th>
              <th scope="col" className="hidden py-3 px-3 font-medium text-center sm:table-cell">Flags</th>
              <th scope="col" className="hidden py-3 px-3 font-medium text-right lg:table-cell">Amount</th>
              <th scope="col" className="hidden py-3 px-3 font-medium text-right md:table-cell">Created</th>
              <th scope="col" className="py-3 pr-4 pl-3 font-medium text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => (
              <BookingRowView key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookingRowView({ row }: { row: BookingRow }) {
  const pax = (row.number_of_adults ?? 0) + (row.number_of_children ?? 0);
  const guestName = row.primary_guest_name || row.guest_facebook_name || row.guest_email;

  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="py-3 pr-3 pl-4 align-middle">
        <StatusBadge status={row.status} />
        {row.is_test_booking && (
          <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Test
          </span>
        )}
      </td>

      <td className="py-3 px-3 align-middle">
        <div className="font-medium leading-tight text-foreground">{guestName}</div>
        <div className="text-xs text-muted-foreground line-clamp-1">{row.guest_email}</div>
      </td>

      <td className="py-3 px-3 align-middle whitespace-nowrap">
        <div className="font-medium text-foreground">
          <span>{formatBookingDateShort(row.check_in_date)}</span>
          <span className="mx-1.5 text-muted-foreground">→</span>
          <span>{formatBookingDate(row.check_out_date)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {row.number_of_nights} {row.number_of_nights === 1 ? 'night' : 'nights'}
        </div>
      </td>

      <td className="hidden py-3 px-3 text-right align-middle tabular-nums md:table-cell">
        {pax}
      </td>

      <td className="hidden py-3 px-3 text-center align-middle sm:table-cell">
        <div className="inline-flex gap-2 items-center">
          {row.need_parking ? (
            <span
              title="Needs parking"
              className="inline-flex gap-1 items-center text-xs rounded-md bg-sky-50 px-1.5 py-0.5 text-sky-900 ring-1 ring-inset ring-sky-200"
            >
              <Car className="size-3" aria-hidden />
              <span className="sr-only">Needs parking</span>
            </span>
          ) : null}
          {row.has_pets ? (
            <span
              title="Has pets"
              className="inline-flex gap-1 items-center text-xs rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-900 ring-1 ring-inset ring-amber-200"
            >
              <Dog className="size-3" aria-hidden />
              <span className="sr-only">Has pets</span>
            </span>
          ) : null}
          {!row.need_parking && !row.has_pets ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : null}
        </div>
      </td>

      <td className="hidden py-3 px-3 text-right align-middle lg:table-cell tabular-nums">
        <span className={row.booking_rate == null ? 'text-muted-foreground' : 'text-foreground'}>
          {formatMoney(row.booking_rate)}
        </span>
      </td>

      <td className="hidden py-3 px-3 text-right align-middle md:table-cell whitespace-nowrap text-muted-foreground">
        {formatRelative(row.created_at)}
      </td>

      <td className="py-3 pr-4 pl-3 text-right align-middle">
        <div className="inline-flex gap-1 items-center">
          <Button
            asChild
            size="sm"
            variant="ghost"
            aria-label={`View booking for ${guestName}`}
            className="px-2 h-8"
          >
            <Link to={`/form?bookingId=${row.id}`}>
              <Eye className="size-3.5" aria-hidden />
              <span className="ml-1 hidden md:inline">View</span>
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            aria-label={`Open guest form for ${guestName} in a new tab`}
            className="hidden px-2 h-8 lg:inline-flex"
            title="Open in new tab"
          >
            <a href={`/form?bookingId=${row.id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border shadow-soft bg-card border-border/60">
      <div className="px-4 py-3 border-b bg-muted/40 border-border/60">
        <div className="h-4 rounded animate-pulse w-36 bg-muted" />
      </div>
      <ul className="divide-y divide-border/50" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex gap-4 items-center px-4 py-4">
            <div className="w-24 h-5 rounded-full animate-pulse bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded animate-pulse bg-muted w-36" />
              <div className="w-48 h-3 rounded animate-pulse bg-muted/70" />
            </div>
            <div className="w-32 h-3 rounded animate-pulse bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
