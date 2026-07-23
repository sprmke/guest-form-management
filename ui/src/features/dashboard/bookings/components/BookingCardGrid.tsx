import { formatMoney } from '@/utils/format/currency';
import { formatBookingDate, formatBookingDateShort } from '@/utils/format/bookingDisplay';
import { useNavigate } from 'react-router-dom';

import { AdminTableFlagsCell } from '@/features/dashboard/bookings/components/AdminDataTable';
import { BookingPropertyLabel } from '@/features/dashboard/bookings/components/BookingPropertyLabel';
import { GuestAvatar } from '@/features/dashboard/bookings/components/GuestAvatar';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import {
  bookingHasInvalidReceiptAi,
  bookingRequestsSurpriseDecor,
} from '@/features/dashboard/bookings/lib/bookingFlags';

import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { BookingsCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { cn } from '@/lib/utils';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  showProperty?: boolean;
  resolveBookingHref?: (row: BookingRow) => string;
};

/**
 * Card grid view for the bookings dashboard.
 * Uses a 2×2 grid on mobile (native dashboard density), scaling up on larger breakpoints.
 */
export function BookingCardGrid({
  rows,
  isLoading,
  error,
  isRefreshing,
  showProperty = false,
  resolveBookingHref,
}: Props) {
  const navigate = useNavigate();

  const openRow = (row: BookingRow) => {
    navigate(resolveBookingHref ? resolveBookingHref(row) : `/bookings/${row.id}`);
  };

  if (error) {
    return (
      <div className="bg-card border-border/50 flex flex-col items-center justify-center gap-3 rounded-xl border px-4 py-12 text-center sm:py-20">
        <div className="flex size-9 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15">
          <span className="text-base font-black leading-none text-red-500">!</span>
        </div>
        <div>
          <p className="text-section-title text-foreground font-bold">Could not load bookings</p>
          <p className="text-caption mt-1 max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <BookingsCardGridSkeleton />;

  if (rows.length === 0) {
    return (
      <div className="bg-card border-border/50 flex flex-col items-center justify-center gap-3 rounded-xl border px-4 py-12 text-center sm:py-20">
        <div className="bg-muted flex size-9 items-center justify-center rounded-full">
          <span className="text-muted-foreground text-lg leading-none">∅</span>
        </div>
        <div>
          <p className="text-section-title text-foreground font-bold">No bookings found</p>
          <p className="text-caption mt-1">Adjust your filters or clear the search.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4',
        'transition-opacity duration-300',
        isRefreshing && 'opacity-60'
      )}
    >
      {rows.map((row) => (
        <BookingCard
          key={row.id}
          row={row}
          showProperty={showProperty}
          onOpen={() => openRow(row)}
        />
      ))}
    </div>
  );
}

function BookingCard({
  row,
  showProperty,
  onOpen,
}: {
  row: BookingRow;
  showProperty: boolean;
  onOpen: () => void;
}) {
  const name = row.primary_guest_name || row.guest_facebook_name || row.guest_email || 'Guest';
  const pax = (row.number_of_adults ?? 0) + (row.number_of_children ?? 0);
  const hasInvalidReceiptAi = bookingHasInvalidReceiptAi(row);
  const hasAnyFlags =
    Boolean(row.need_parking) ||
    Boolean(row.has_pets) ||
    bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) ||
    hasInvalidReceiptAi;

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      aria-label={`Open booking for ${name}`}
      className={cn(
        'bg-card group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-200',
        'border-border/50 border shadow-sm dark:shadow-none',
        'outline-none hover:-translate-y-0.5',
        'focus-visible:ring-sidebar-primary/40 focus-visible:ring-2'
      )}
    >
      {/* Top: mobile = status beside guest; sm+ = status above avatar + name */}
      <div className="space-y-3 p-3 pb-2.5 sm:space-y-4 sm:p-4 sm:pb-3">
        <StatusBadge status={row.status} className="w-fit max-w-full" />
        <div className="flex items-start justify-between gap-2 sm:justify-start">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial">
            <GuestAvatar name={name} validIdUrl={row.valid_id_url} size="lg" className="shrink-0" />
            <div className="min-w-0">
              <p className="text-foreground truncate text-xs font-bold leading-tight sm:text-sm">
                {name}
              </p>
              <p className="text-data-secondary mt-0.5 truncate">{row.guest_email}</p>
              {showProperty ? (
                <BookingPropertyLabel name={row.property_name} className="mt-0.5 font-medium" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Body: stay */}
      <div className="px-3 pb-2.5 sm:px-4 sm:pb-3">
        <div>
          <p className="text-overline">Stay</p>
          <p className="text-data-primary mt-0.5 whitespace-nowrap">
            {formatBookingDateShort(row.check_in_date)}
            <span className="text-muted-foreground/50 mx-1.5 font-light">→</span>
            {formatBookingDate(row.check_out_date)}
          </p>
          <p className="text-data-secondary mt-0.5">
            {row.number_of_nights} {row.number_of_nights === 1 ? 'night' : 'nights'}
            <span className="text-muted-foreground/50 mx-1.5">·</span>
            {pax} {pax === 1 ? 'guest' : 'guests'}
          </p>
        </div>
      </div>

      {/* Footer: flags + amount */}
      <div className="border-separator bg-muted/20 dark:bg-muted/30 flex items-center justify-between gap-2 border-t px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {hasAnyFlags ? (
            <AdminTableFlagsCell
              need_parking={row.need_parking}
              has_pets={row.has_pets}
              guest_requests_surprise_decor={row.guest_requests_surprise_decor}
              has_invalid_receipt_ai={hasInvalidReceiptAi}
            />
          ) : (
            <span className="text-caption text-muted-foreground/50">No flags</span>
          )}
        </div>

        {row.booking_rate != null && (
          <span className="text-table-amount shrink-0">{formatMoney(row.booking_rate)}</span>
        )}
      </div>
    </div>
  );
}
