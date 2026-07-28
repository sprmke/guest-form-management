import { Calendar, Car, ChevronDown, Dog, Edit2, PartyPopper, Users, X } from 'lucide-react';

import { PayParkingHeaderButton } from '@/features/dashboard/bookings/components/PayParkingModal';
import {
  bookingRequestsSurpriseDecor,
  bookingFlagLabelChipClass,
} from '@/features/dashboard/bookings/lib/bookingFlags';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { cn } from '@/lib/utils';
import { formatBookingDate } from '@/utils/format/bookingDisplay';

type Props = {
  booking: BookingRow;
  detailsExpanded: boolean;
  onToggleDetails: () => void;
  onPayParking: () => void;
  editMode?: boolean;
  onEdit?: () => void;
  onCancelEdit?: () => void;
  className?: string;
};

/**
 * Compact booking strip for mobile detail.
 * Keeps workflow (Progress) above the fold; expanded panel shows detail cards only
 * (header actions live here — desktop uses BookingHeader inside the panel).
 */
export function BookingDetailMobileSummary({
  booking,
  detailsExpanded,
  onToggleDetails,
  onPayParking,
  editMode = false,
  onEdit,
  onCancelEdit,
  className,
}: Props) {
  const pax = (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  const fb = booking.guest_facebook_name?.trim() ?? '';
  const primary = booking.primary_guest_name?.trim() ?? '';
  const heading = fb || primary || 'Booking';
  const hasDecor = bookingRequestsSurpriseDecor(booking.guest_requests_surprise_decor);

  return (
    <section
      className={cn('border-border bg-card rounded-xl border p-3 shadow-sm sm:p-4', className)}
      aria-label="Booking summary"
    >
      <div className="min-w-0">
        <h1 className="text-foreground break-words text-base font-bold leading-tight">{heading}</h1>
        {fb && primary && fb.toLowerCase() !== primary.toLowerCase() && (
          <p className="text-muted-foreground mt-0.5 truncate text-[11px] font-medium">{primary}</p>
        )}
      </div>

      <p className="text-muted-foreground mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        <span className="inline-flex items-center gap-1">
          <Calendar className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          {formatBookingDate(booking.check_in_date)}
          <span className="text-muted-foreground/50" aria-hidden>
            →
          </span>
          {formatBookingDate(booking.check_out_date)}
        </span>
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Users className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          {pax} pax · {booking.number_of_nights}{' '}
          {booking.number_of_nights === 1 ? 'night' : 'nights'}
        </span>
      </p>

      {(booking.need_parking || booking.has_pets || hasDecor) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {booking.need_parking && (
            <span className={bookingFlagLabelChipClass.parking}>
              <Car className="size-3" aria-hidden />
              Parking
            </span>
          )}
          {booking.has_pets && (
            <span className={bookingFlagLabelChipClass.pet}>
              <Dog className="size-3" aria-hidden />
              Pets
            </span>
          )}
          {hasDecor && (
            <span className={bookingFlagLabelChipClass.decor}>
              <PartyPopper className="size-3" aria-hidden />
              Decor
            </span>
          )}
        </div>
      )}

      {!editMode && (
        <div className="mt-3">
          <PayParkingHeaderButton
            booking={booking}
            onOpenModal={onPayParking}
            onViewParking={onPayParking}
          />
        </div>
      )}

      <div
        className={cn(
          'mt-3 flex flex-col gap-2',
          detailsExpanded && 'sm:flex-row sm:items-stretch'
        )}
      >
        <button
          type="button"
          onClick={onToggleDetails}
          aria-expanded={detailsExpanded}
          aria-controls="booking-detail-full-panel"
          className={cn(
            'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200',
            detailsExpanded
              ? 'border-border bg-muted/50 text-foreground hover:bg-muted border'
              : 'border-sidebar-primary/30 bg-sidebar-primary/5 text-sidebar-primary hover:bg-sidebar-primary/10 border'
          )}
        >
          <span>{detailsExpanded ? 'Hide full booking details' : 'View full booking details'}</span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none',
              detailsExpanded && 'rotate-180'
            )}
            aria-hidden
          />
        </button>

        {detailsExpanded &&
          (editMode ? (
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancel and close the form"
              className="border-border bg-card text-muted-foreground hover:bg-muted/50 inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border px-4 text-[13px] font-semibold shadow-sm transition-colors"
            >
              <X className="size-4 shrink-0" aria-hidden />
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="border-border bg-card text-muted-foreground hover:bg-muted/50 inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border px-4 text-[13px] font-semibold shadow-sm transition-colors"
            >
              <Edit2 className="size-4 shrink-0" aria-hidden />
              Edit
            </button>
          ))}
      </div>
    </section>
  );
}
