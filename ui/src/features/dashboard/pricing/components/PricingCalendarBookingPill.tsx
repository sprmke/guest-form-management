import { GuestAvatar } from '@/features/dashboard/bookings/components/GuestAvatar';
import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';
import type { CalendarOccupancySpanPosition } from '@/features/dashboard/bookings/components/calendar/calendarDateUtils';

import { cn } from '@/lib/utils';

type Props = {
  status: string;
  label: string;
  title?: string;
  spanPosition?: CalendarOccupancySpanPosition;
  showLabel?: boolean;
  guestName?: string;
  validIdUrl?: string | null;
};

export function PricingCalendarBookingPill({
  status,
  label,
  title,
  spanPosition = 'single',
  showLabel = true,
  guestName,
  validIdUrl,
}: Props) {
  const roundedClass =
    spanPosition === 'start'
      ? 'rounded-l-full rounded-r-sm'
      : spanPosition === 'end'
        ? 'rounded-r-full rounded-l-sm'
        : spanPosition === 'middle'
          ? 'rounded-sm'
          : 'rounded-full';

  return (
    <div
      className={cn(
        'bg-primary text-primary-foreground flex h-7 w-full min-w-0 items-center shadow-sm',
        'ring-primary/25 ring-1',
        roundedClass
      )}
      title={title ?? `${label} · ${statusLabel(status)}`}
    >
      {showLabel ? (
        <span className="flex min-w-0 items-center gap-1.5 py-0.5 pl-0.5 pr-2.5">
          <GuestAvatar
            name={guestName || label}
            validIdUrl={validIdUrl}
            size="xs"
            className="ring-primary-foreground/35 shadow-sm ring-1"
          />
          <span className="truncate text-[11px] font-semibold leading-none tracking-tight">
            {label}
          </span>
        </span>
      ) : (
        <span aria-hidden className="block h-full w-full min-w-[0.5rem]" />
      )}
    </div>
  );
}
