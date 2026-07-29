import { Car, Dog, PartyPopper } from 'lucide-react';

import {
  bookingFlagLabelChipClass,
  bookingRequestsSurpriseDecor,
} from '@/features/dashboard/bookings/lib/bookingFlags';

import { cn } from '@/lib/utils';

type BookingFlagSource = {
  need_parking?: boolean | null;
  has_pets?: boolean | null;
  guest_requests_surprise_decor?: unknown;
};

/** Parking / pets / decor chips for booking detail header and mobile summary. */
export function BookingDetailFlagChips({
  booking,
  className,
}: {
  booking: BookingFlagSource;
  className?: string;
}) {
  const hasDecor = bookingRequestsSurpriseDecor(booking.guest_requests_surprise_decor);
  if (!booking.need_parking && !booking.has_pets && !hasDecor) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {booking.need_parking ? (
        <span className={bookingFlagLabelChipClass.parking}>
          <Car className="size-3" aria-hidden />
          Parking
        </span>
      ) : null}
      {booking.has_pets ? (
        <span className={bookingFlagLabelChipClass.pet}>
          <Dog className="size-3" aria-hidden />
          Pets
        </span>
      ) : null}
      {hasDecor ? (
        <span className={bookingFlagLabelChipClass.decor}>
          <PartyPopper className="size-3" aria-hidden />
          Decor
        </span>
      ) : null}
    </div>
  );
}
