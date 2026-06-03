import { useNavigate } from 'react-router-dom';
import { Car, Dog, PartyPopper } from 'lucide-react';
import { BookingsCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { GuestAvatar } from '@/features/admin/components/GuestAvatar';
import {
  formatBookingDate,
  formatBookingDateShort,
  formatMoney,
} from '@/features/admin/lib/formatters';
import { bookingRequestsSurpriseDecor, bookingFlagIconChipClass } from '@/features/admin/lib/bookingFlags';
import type { BookingRow } from '@/features/admin/lib/types';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
};

/**
 * Card grid view for the bookings dashboard.
 * Mirrors the responsive grid pattern of property-management-app's
 * `PaymentsGridView` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`)
 * but tuned for booking content density (richer guest + stay info).
 */
export function BookingCardGrid({
  rows,
  isLoading,
  error,
  isRefreshing,
}: Props) {
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="flex flex-col gap-3 justify-center items-center py-20 text-center bg-card rounded-xl border border-border/50">
        <div className="flex justify-center items-center bg-red-50 dark:bg-red-500/15 rounded-full size-9">
          <span className="text-base font-black leading-none text-red-500">
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

  if (isLoading) return <BookingsCardGridSkeleton />;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-3 justify-center items-center py-20 text-center bg-card rounded-xl border border-border/50">
        <div className="flex justify-center items-center rounded-full size-9 bg-muted">
          <span className="text-lg leading-none text-muted-foreground">∅</span>
        </div>
        <div>
          <p className="text-section-title font-bold text-foreground">
            No bookings found
          </p>
          <p className="mt-1 text-caption">
            Adjust your filters or clear the search.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        'transition-opacity duration-300',
        isRefreshing && 'opacity-60',
      )}
    >
      {rows.map((row) => (
        <BookingCard
          key={row.id}
          row={row}
          onOpen={() => navigate(`/bookings/${row.id}`)}
        />
      ))}
    </div>
  );
}

function BookingCard({ row, onOpen }: { row: BookingRow; onOpen: () => void }) {
  const name =
    row.primary_guest_name ||
    row.guest_facebook_name ||
    row.guest_email ||
    'Guest';
  const pax = (row.number_of_adults ?? 0) + (row.number_of_children ?? 0);

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
        'group relative bg-card rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
        'border border-border/50 shadow-sm dark:shadow-none',
        'hover:-translate-y-0.5 outline-none',
        'focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
      )}
    >
      {/* Top: mobile = status beside guest; sm+ = status above avatar + name */}
      <div className="space-y-4 p-4 pb-3">
        <StatusBadge
          status={row.status}
          className="w-fit max-w-full"
        />
        <div className="flex items-start justify-between gap-2 sm:justify-start">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial">
            <GuestAvatar
              name={name}
              validIdUrl={row.valid_id_url}
              size="lg"
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-foreground">
                {name}
              </p>
              <p className="mt-0.5 truncate text-data-secondary">
                {row.guest_email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Body: stay */}
      <div className="px-4 pb-3">
        <div>
          <p className="text-overline">
            Stay
          </p>
          <p className="mt-0.5 whitespace-nowrap text-data-primary">
            {formatBookingDateShort(row.check_in_date)}
            <span className="mx-1.5 text-muted-foreground/50 font-light">→</span>
            {formatBookingDate(row.check_out_date)}
          </p>
          <p className="mt-0.5 text-data-secondary">
            {row.number_of_nights}{' '}
            {row.number_of_nights === 1 ? 'night' : 'nights'}
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            {pax} {pax === 1 ? 'guest' : 'guests'}
          </p>
        </div>
      </div>

      {/* Footer: flags + amount */}
      <div className="flex items-center justify-between gap-2 border-t border-separator bg-muted/20 px-4 py-3 dark:bg-muted/30">
        <div className="flex items-center gap-1.5 min-w-0">
          {row.need_parking ? (
            <span
              title="Needs parking"
              aria-label="Needs parking"
              className={cn('size-7', bookingFlagIconChipClass.parking)}
            >
              <Car className="size-4" aria-hidden />
            </span>
          ) : null}
          {row.has_pets ? (
            <span
              title="Has pets"
              aria-label="Has pets"
              className={cn('size-7', bookingFlagIconChipClass.pet)}
            >
              <Dog className="size-4" aria-hidden />
            </span>
          ) : null}
          {bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) ? (
            <span
              title="Surprise decor setup"
              aria-label="Surprise decor setup"
              className={cn('size-7', bookingFlagIconChipClass.decor)}
            >
              <PartyPopper className="size-4" aria-hidden />
            </span>
          ) : null}
          {!row.need_parking &&
            !row.has_pets &&
            !bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) && (
            <span className="text-caption text-muted-foreground/50">No flags</span>
          )}
        </div>

        {row.booking_rate != null && (
          <span className="shrink-0 text-table-amount">
            {formatMoney(row.booking_rate)}
          </span>
        )}
      </div>
    </div>
  );
}
