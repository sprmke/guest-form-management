import { useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { ParkingBroadcastCountdown } from '@/features/dashboard/bookings/components/ParkingBroadcastCountdown';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { useBooking } from '@/features/dashboard/bookings/hooks/useBooking';
import { useParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { parkingSectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import {
  useClaimParkingBooking,
  useDeclineParkingBooking,
  useTransitionParkingBooking,
} from '@/features/dashboard/parking/hooks/useParkingBookingMutations';
import { useParkingBroadcastStatus } from '@/features/dashboard/parking/hooks/useParkingBroadcastStatus';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parkingDashboardPageTitle, usePageTitle } from '@/lib/pageTitle';
import { formatBookingDate } from '@/utils/format/bookingDisplay';

const NEXT_STATUS: Record<string, { label: string; to: string } | undefined> = {
  PENDING_REVIEW: { label: 'Mark active', to: 'READY_FOR_CHECKIN' },
  READY_FOR_CHECKIN: { label: 'Complete', to: 'COMPLETED' },
};

const ENDORSEMENT_NOTE_MAX = 500;

export function ParkingBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { parking, org, orgSlug, parkingSlug } = useParkingContext();
  const { data: booking, isLoading, error } = useBooking(bookingId, { parkingId: parking.id });
  const guestName = booking?.primary_guest_name || booking?.guest_facebook_name;
  usePageTitle(
    booking
      ? parkingDashboardPageTitle(
          org.name,
          parking.name,
          guestName ? `Booking: ${guestName}` : `Booking ${booking.id.slice(0, 8)}`
        )
      : undefined
  );
  const transition = useTransitionParkingBooking(parking.id);
  const claim = useClaimParkingBooking(parking.id);
  const decline = useDeclineParkingBooking(parking.id);
  const [endorsementNote, setEndorsementNote] = useState('');

  const isPendingAcceptance = booking?.status === 'PENDING_HOST_ACCEPTANCE';
  const { data: broadcastStatus, isLoading: broadcastLoading } = useParkingBroadcastStatus(
    bookingId,
    parking.id,
    isPendingAcceptance
  );

  const next = booking?.status ? NEXT_STATUS[String(booking.status)] : undefined;
  const canCancel =
    booking?.status &&
    !isPendingAcceptance &&
    booking.status !== 'CANCELLED' &&
    booking.status !== 'COMPLETED' &&
    booking.status !== 'NO_HOST_AVAILABLE';

  if (isLoading || (isPendingAcceptance && broadcastLoading)) {
    return (
      <AdminMobilePage title="Booking" subtitle={parking.name} titleId="parking-booking-heading">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </AdminMobilePage>
    );
  }

  const notFound = error || !booking || (isPendingAcceptance && !broadcastStatus?.exists);

  if (notFound) {
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

  const myBroadcastPending = isPendingAcceptance && broadcastStatus?.response === 'pending';
  const busy = claim.isPending || decline.isPending;

  const desktopActions = (
    <div className="flex flex-wrap gap-2">
      {myBroadcastPending ? (
        <>
          <Button
            type="button"
            disabled={busy}
            loading={claim.isPending}
            className="min-h-[44px]"
            onClick={() =>
              claim.mutate({ bookingId: booking.id, endorsementNote: endorsementNote.trim() })
            }
          >
            Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            loading={decline.isPending}
            className="min-h-[44px]"
            onClick={() => decline.mutate({ bookingId: booking.id })}
          >
            Decline
          </Button>
        </>
      ) : null}
      {next ? (
        <Button
          type="button"
          disabled={transition.isPending}
          className="min-h-[44px]"
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
          className="min-h-[44px]"
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
      {(myBroadcastPending || next || canCancel) && (
        <div className="flex flex-wrap gap-2 lg:hidden">{desktopActions}</div>
      )}

      <FloatingPanel padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          {isPendingAcceptance && booking.parking_broadcast_expires_at && (
            <ParkingBroadcastCountdown expiresAt={booking.parking_broadcast_expires_at} />
          )}
        </div>

        {myBroadcastPending && (
          <div className="space-y-1.5">
            <label htmlFor="endorsement-note" className="text-muted-foreground text-sm">
              Access instructions (optional)
            </label>
            <Textarea
              id="endorsement-note"
              value={endorsementNote}
              onChange={(event) =>
                setEndorsementNote(event.target.value.slice(0, ENDORSEMENT_NOTE_MAX))
              }
              disabled={busy}
              rows={3}
              placeholder="Shown to the guest after Accept"
              className="resize-y"
            />
            <p className="text-muted-foreground text-xs tabular-nums">
              {endorsementNote.length}/{ENDORSEMENT_NOTE_MAX}
            </p>
          </div>
        )}

        {isPendingAcceptance && !myBroadcastPending && (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {broadcastStatus?.response === 'claimed'
              ? 'Claimed by another host.'
              : broadcastStatus?.response === 'declined'
                ? 'You declined this request.'
                : 'This request is no longer available.'}
          </p>
        )}

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
