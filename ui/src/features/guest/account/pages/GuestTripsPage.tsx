import { Link } from 'react-router-dom';

import { STATUS_LABELS, type BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import { GuestAccountEmptyState } from '@/features/guest/account/components/GuestAccountEmptyState';
import { useGuestTrips } from '@/features/guest/account/hooks/useGuestTrips';
import {
  guestFormPath,
  guestPropertyPath,
  guestSdFormPath,
} from '@/features/guest/lib/guestPublicPaths';

import { Badge } from '@/components/ui/badge';
import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';

function tripActionPath(trip: {
  id: string;
  status: string;
  propertySlug: string | null;
}): string | null {
  const slug = trip.propertySlug?.trim();
  if (!slug) return null;

  const status = trip.status as BookingStatus;
  if (status === 'PENDING_REVIEW') {
    const params = new URLSearchParams({ bookingId: trip.id });
    return guestFormPath(slug, params);
  }
  if (status === 'READY_FOR_CHECKOUT' || status === 'PENDING_SD_REFUND') {
    return guestSdFormPath(slug, trip.id);
  }
  return guestPropertyPath(slug);
}

export function GuestTripsPage() {
  const { data, isLoading, isError } = useGuestTrips();
  const trips = data?.trips ?? [];

  if (isLoading) {
    return <div className="bg-muted h-48 animate-pulse rounded-2xl" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">Could not load stays.</p>;
  }

  if (trips.length === 0) {
    return (
      <GuestAccountEmptyState
        message="No stays yet."
        actionLabel="Browse properties"
        actionHref="/properties"
      />
    );
  }

  return (
    <div className="grid w-full gap-4">
      {trips.map((trip) => {
        const actionHref = tripActionPath(trip);
        const statusLabel =
          STATUS_LABELS[trip.status as BookingStatus] ?? trip.status.replace(/_/g, ' ');
        const card = (
          <div className="border-border bg-card flex gap-4 overflow-hidden rounded-2xl border p-4">
            <div className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-xl">
              {trip.imageUrl ? (
                <Image
                  src={trip.imageUrl}
                  alt=""
                  width={96}
                  height={96}
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-foreground line-clamp-2 font-semibold">
                  {trip.propertyName ?? 'Stay'}
                </p>
                <Badge variant="secondary" className="shrink-0">
                  {statusLabel}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {trip.checkInDate} → {trip.checkOutDate}
              </p>
              {trip.guestFacebookName ? (
                <p className="text-muted-foreground truncate text-sm">{trip.guestFacebookName}</p>
              ) : null}
            </div>
          </div>
        );

        if (!actionHref) {
          return <div key={trip.id}>{card}</div>;
        }

        return (
          <Link key={trip.id} to={actionHref} className="block transition-opacity hover:opacity-90">
            {card}
          </Link>
        );
      })}
    </div>
  );
}
