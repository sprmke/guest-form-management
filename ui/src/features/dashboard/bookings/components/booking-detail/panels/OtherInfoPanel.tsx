import { Info, MessageSquare, Search } from 'lucide-react';

import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import {
  BookingDetailRow,
  BookingDetailRowGroup,
} from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailRow';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { cn } from '@/lib/utils';

export function OtherInfoPanel({ booking }: { booking: BookingRow }) {
  const source = booking.booking_source || 'Direct';
  const isAirbnb = source === 'Airbnb';

  return (
    <BookingDetailCard title="Other information" icon={Info}>
      <BookingDetailRowGroup>
        <BookingDetailRow label="Booking source">
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold',
              isAirbnb
                ? 'border-orange-500/25 bg-orange-500/10 text-orange-700'
                : 'border-primary/25 bg-primary/10 text-primary'
            )}
          >
            {source}
          </span>
        </BookingDetailRow>
        <BookingDetailRow label="Surprise decor">
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold',
              booking.guest_requests_surprise_decor
                ? 'border-violet-500/25 bg-violet-500/10 text-violet-800'
                : 'border-border bg-muted/50 text-muted-foreground'
            )}
          >
            {booking.guest_requests_surprise_decor ? 'Requested' : 'Not requested'}
          </span>
        </BookingDetailRow>
        {(booking.find_us || booking.find_us_details) && (
          <BookingDetailRow label="How they found us">
            <span className="text-foreground flex min-w-0 flex-wrap items-center justify-end gap-2 text-right text-sm font-semibold">
              {booking.find_us ? (
                <span className="border-border bg-muted/50 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs">
                  <Search className="text-muted-foreground size-3" aria-hidden />
                  {booking.find_us}
                </span>
              ) : null}
              {booking.find_us_details ? (
                <span className="text-muted-foreground text-xs font-medium">
                  {booking.find_us_details}
                </span>
              ) : null}
            </span>
          </BookingDetailRow>
        )}
        {booking.guest_special_requests ? (
          <BookingDetailRow label="Special requests">
            <span className="text-foreground flex min-w-0 items-start justify-end gap-2 text-right text-sm font-medium leading-snug">
              <MessageSquare
                className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                aria-hidden
              />
              <span className="min-w-0 break-words">{booking.guest_special_requests}</span>
            </span>
          </BookingDetailRow>
        ) : null}
      </BookingDetailRowGroup>
    </BookingDetailCard>
  );
}
