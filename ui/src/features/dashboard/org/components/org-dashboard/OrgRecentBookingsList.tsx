import { Link } from 'react-router-dom';

import { ChevronRight } from 'lucide-react';

import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { bookingDetailPath } from '@/features/dashboard/org/lib/tenantPaths';
import type { DashboardRecentBooking } from '@/features/dashboard/property/lib/types';

import { formatMoney } from '@/utils/format/currency';
import { formatDateToLongFormat } from '@/utils/format/dates';

function formatStayRange(checkInIso: string, checkOutIso: string): string {
  const checkIn = formatDateToLongFormat(checkInIso);
  const checkOut = formatDateToLongFormat(checkOutIso);
  if (!checkIn && !checkOut) return '';
  if (!checkOut) return checkIn;
  return `${checkIn} → ${checkOut}`;
}

type Props = {
  orgSlug: string;
  bookings: DashboardRecentBooking[];
};

export function OrgRecentBookingsList({ orgSlug, bookings }: Props) {
  return (
    <section className="surface-card min-w-0 p-3 sm:p-4 lg:col-span-2">
      <p className="text-section-title mb-3">Recent Bookings</p>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">No bookings in this period</p>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => {
            const detailPath = booking.propertySlug
              ? bookingDetailPath(orgSlug, booking.propertySlug, booking.id)
              : null;

            const row = (
              <div className="border-border hover:bg-muted/40 flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2.5 transition-colors sm:gap-3 sm:px-3 sm:py-3">
                <div
                  className="bg-primary/10 text-primary hidden size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold lg:flex"
                  aria-hidden
                >
                  {booking.guestName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? '')
                    .join('')}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-foreground truncate text-xs font-semibold sm:text-sm">
                      {booking.guestName}
                    </span>
                    <StatusBadge status={booking.status} className="hidden lg:inline-flex" />
                  </div>
                  <p className="text-muted-foreground truncate text-[11px] sm:text-sm">
                    {booking.propertyName}
                    <span className="hidden sm:inline">
                      {' '}
                      · {formatStayRange(booking.checkInIso, booking.checkOutIso)}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums sm:text-sm">
                    {formatMoney(booking.amount)}
                  </p>
                </div>
                {detailPath ? (
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
                ) : null}
              </div>
            );

            return detailPath ? (
              <Link key={booking.id} to={detailPath} className="block min-w-0">
                {row}
              </Link>
            ) : (
              <div key={booking.id}>{row}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
