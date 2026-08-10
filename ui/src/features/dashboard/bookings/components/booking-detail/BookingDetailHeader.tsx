import { Calendar, Edit2, Users } from 'lucide-react';

import { BookingDetailFlagChips } from '@/features/dashboard/bookings/components/BookingDetailFlagChips';
import { occupiedNightsFromStay } from '@/features/dashboard/bookings/components/calendar/calendarStayAmounts';
import { PayParkingHeaderButton } from '@/features/dashboard/bookings/components/PayParkingModal';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { Button } from '@/components/ui/button';
import { toneBadgeClasses } from '@/lib/statusToneColors';
import { cn } from '@/lib/utils';
import { formatBookingDate } from '@/utils/format/bookingDisplay';

type Props = {
  booking: BookingRow;
  onEdit: () => void;
  onPayParking: () => void;
  className?: string;
};

/**
 * View-mode header — reservation summary strip (not used in edit mode).
 * Bespoke card (not `BookingDetailCard`, which is row/panel-shaped), but shares the
 * same surface/typography language so it reads as part of the same system.
 */
export function BookingDetailHeader({ booking, onEdit, onPayParking, className }: Props) {
  const pax = (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  const nights = occupiedNightsFromStay(
    booking.check_in_date,
    booking.check_out_date,
    booking.number_of_nights
  );
  const fb = booking.guest_facebook_name?.trim() ?? '';
  const primary = booking.primary_guest_name?.trim() ?? '';
  const heading = fb || primary || 'Booking';
  const showPrimarySubtitle = Boolean(fb && primary && fb.toLowerCase() !== primary.toLowerCase());
  const source = booking.booking_source?.trim() || 'Direct';
  const isAirbnb = source === 'Airbnb';

  return (
    <header
      className={cn(
        'surface-card from-card via-card to-muted/30 relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 sm:p-6',
        className
      )}
    >
      <div
        className="bg-primary/8 pointer-events-none absolute -right-8 -top-8 size-40 rounded-full blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                isAirbnb
                  ? toneBadgeClasses('orange')
                  : 'border-primary/25 bg-primary/10 text-primary'
              )}
            >
              {source}
            </span>
          </div>

          <div>
            <h1 className="text-foreground text-xl font-bold leading-tight tracking-tight sm:text-2xl">
              {heading}
            </h1>
            {showPrimarySubtitle ? (
              <p className="text-muted-foreground mt-1 text-sm font-medium">{primary}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="border-border/70 bg-background/80 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm">
              <Calendar className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
              <span>
                {formatBookingDate(booking.check_in_date)}
                <span className="text-muted-foreground/60 mx-1.5" aria-hidden>
                  →
                </span>
                {formatBookingDate(booking.check_out_date)}
              </span>
            </span>
            <span className="border-border/70 bg-background/80 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm">
              <Users className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
              {pax} pax · {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          </div>

          <BookingDetailFlagChips booking={booking} />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          <PayParkingHeaderButton
            booking={booking}
            onOpenModal={onPayParking}
            onViewParking={onPayParking}
          />
          <Button type="button" onClick={onEdit} size="sm" className="min-h-[44px] gap-1.5 px-5">
            <Edit2 className="size-4" aria-hidden />
            Edit booking
          </Button>
        </div>
      </div>
    </header>
  );
}
