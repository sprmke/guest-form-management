import {
  Calendar,
  Car,
  ChevronDown,
  Dog,
  PartyPopper,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBookingDate } from '@/features/admin/lib/formatters';
import { bookingRequestsSurpriseDecor } from '@/features/admin/lib/bookingFlags';
import { PayParkingHeaderButton } from '@/features/admin/components/PayParkingModal';
import type { BookingRow } from '@/features/admin/lib/types';

type Props = {
  booking: BookingRow;
  detailsExpanded: boolean;
  onToggleDetails: () => void;
  onPayParking: () => void;
  className?: string;
};

/**
 * Compact booking strip for mobile detail.
 * Keeps workflow (Progress) above the fold; full cards + Edit live in the collapsible below.
 */
export function BookingDetailMobileSummary({
  booking,
  detailsExpanded,
  onToggleDetails,
  onPayParking,
  className,
}: Props) {
  const pax =
    (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  const fb = booking.guest_facebook_name?.trim() ?? '';
  const primary = booking.primary_guest_name?.trim() ?? '';
  const heading = fb || primary || 'Booking';
  const hasDecor = bookingRequestsSurpriseDecor(
    booking.guest_requests_surprise_decor,
  );

  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4',
        className,
      )}
      aria-label="Booking summary"
    >
      <div className="min-w-0">
        <h1 className="text-base font-bold leading-tight text-foreground break-words">
          {heading}
        </h1>
        {fb && primary && fb.toLowerCase() !== primary.toLowerCase() && (
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
            {primary}
          </p>
        )}
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {formatBookingDate(booking.check_in_date)}
          <span className="text-muted-foreground/50" aria-hidden>
            →
          </span>
          {formatBookingDate(booking.check_out_date)}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {pax} pax · {booking.number_of_nights}{' '}
          {booking.number_of_nights === 1 ? 'night' : 'nights'}
        </span>
      </p>

      {(booking.need_parking || booking.has_pets || hasDecor) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {booking.need_parking && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200/80">
              <Car className="size-3" aria-hidden />
              Parking
            </span>
          )}
          {booking.has_pets && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/80">
              <Dog className="size-3" aria-hidden />
              Pets
            </span>
          )}
          {hasDecor && (
            <span className="inline-flex items-center gap-1 rounded-md bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800 ring-1 ring-inset ring-fuchsia-200/80">
              <PartyPopper className="size-3" aria-hidden />
              Decor
            </span>
          )}
        </div>
      )}

      <div className="mt-3">
        <PayParkingHeaderButton
          booking={booking}
          onOpenModal={onPayParking}
          onViewParking={onPayParking}
        />
      </div>

      <button
        type="button"
        onClick={onToggleDetails}
        aria-expanded={detailsExpanded}
        aria-controls="booking-detail-full-panel"
        className={cn(
          'mt-3 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200',
          detailsExpanded
            ? 'border border-border bg-muted/50 text-foreground hover:bg-muted'
            : 'border border-sidebar-primary/30 bg-sidebar-primary/5 text-sidebar-primary hover:bg-sidebar-primary/10',
        )}
      >
        <span>
          {detailsExpanded
            ? 'Hide full booking details'
            : 'View full booking details'}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none',
            detailsExpanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
    </section>
  );
}
