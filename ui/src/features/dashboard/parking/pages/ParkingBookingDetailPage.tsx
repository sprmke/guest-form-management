import { Link, useParams } from 'react-router-dom';

import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { useBooking } from '@/features/dashboard/bookings/hooks/useBooking';
import { useParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { parkingSectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { useTransitionParkingBooking } from '@/features/dashboard/parking/hooks/useParkingBookingMutations';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { Button } from '@/components/ui/button';
import { formatBookingDate } from '@/utils/format/bookingDisplay';

const NEXT_STATUS: Record<string, { label: string; to: string } | undefined> = {
  PENDING_REVIEW: { label: 'Mark active', to: 'READY_FOR_CHECKIN' },
  READY_FOR_CHECKIN: { label: 'Complete', to: 'COMPLETED' },
};

export function ParkingBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { parking, orgSlug, parkingSlug } = useParkingContext();
  const { data: booking, isLoading, error } = useBooking(bookingId, { parkingId: parking.id });
  const transition = useTransitionParkingBooking(parking.id);

  const next = booking?.status ? NEXT_STATUS[String(booking.status)] : undefined;
  const canCancel =
    booking?.status && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';

  if (isLoading) {
    return (
      <AdminMobilePage title="Booking" subtitle={parking.name} titleId="parking-booking-heading">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </AdminMobilePage>
    );
  }

  if (error || !booking) {
    return (
      <AdminMobilePage title="Booking" subtitle={parking.name} titleId="parking-booking-heading">
        <FloatingPanel padding="lg" className="space-y-3">
          <p className="text-destructive text-sm">Could not load booking.</p>
          <Link
            to={parkingSectionPath(orgSlug, parkingSlug, 'bookings')}
            className="text-sm underline"
          >
            Back to bookings
          </Link>
        </FloatingPanel>
      </AdminMobilePage>
    );
  }

  const desktopActions = (
    <div className="flex flex-wrap gap-2">
      {next ? (
        <Button
          type="button"
          disabled={transition.isPending}
          onClick={() => transition.mutate({ bookingId: booking.id, toStatus: next.to })}
        >
          {next.label}
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          type="button"
          variant="outline"
          disabled={transition.isPending}
          onClick={() => transition.mutate({ bookingId: booking.id, toStatus: 'CANCELLED' })}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );

  return (
    <AdminMobilePage
      title={booking.primary_guest_name || 'Parking booking'}
      subtitle={parking.name}
      titleId="parking-booking-heading"
      desktopActions={desktopActions}
    >
      {(next || canCancel) && (
        <div className="flex flex-wrap gap-2 lg:hidden">{desktopActions}</div>
      )}

      <FloatingPanel padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{booking.guest_email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{booking.guest_phone_number}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Check-in</dt>
            <dd>{formatBookingDate(booking.check_in_date)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Check-out</dt>
            <dd>{formatBookingDate(booking.check_out_date)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plate</dt>
            <dd>{booking.car_plate_number ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vehicle</dt>
            <dd>
              {[booking.car_brand_model, booking.car_color].filter(Boolean).join(' · ') || '—'}
            </dd>
          </div>
        </dl>
      </FloatingPanel>
    </AdminMobilePage>
  );
}
