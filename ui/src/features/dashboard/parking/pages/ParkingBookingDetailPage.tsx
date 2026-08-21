import { useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { Car, Mail, Phone, Timer } from 'lucide-react';

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
import { ParkingStaySummary } from '@/components/parking/ParkingStaySummary';
import { ParkingBookingDetailPageSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parkingDashboardPageTitle, usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';

const NEXT_STATUS: Record<string, { label: string; to: string } | undefined> = {
  PENDING_REVIEW: { label: 'Mark active', to: 'READY_FOR_CHECKIN' },
  READY_FOR_CHECKIN: { label: 'Complete', to: 'COMPLETED' },
};

const ENDORSEMENT_NOTE_MAX = 500;

function DetailField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Mail;
}) {
  return (
    <div className="border-border/60 bg-muted/20 flex gap-3 rounded-xl border p-3.5">
      <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
        <dd className="text-foreground mt-0.5 break-words text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}

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
        <ParkingBookingDetailPageSkeleton />
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
  const vehicleLabel =
    [booking.car_brand_model, booking.car_color].filter(Boolean).join(' · ') || '—';

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

      <FloatingPanel padding="lg" className="space-y-5">
        {myBroadcastPending && booking.parking_broadcast_expires_at && (
          <div
            className={cn(
              'flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
              'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30'
            )}
          >
            <div className="flex items-start gap-3">
              <Timer
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
                aria-hidden
              />
              <div>
                <p className="text-foreground text-sm font-semibold">
                  Respond before time runs out
                </p>
                <p className="text-muted-foreground text-xs">
                  First host to accept claims this request
                </p>
              </div>
            </div>
            <ParkingBroadcastCountdown
              expiresAt={booking.parking_broadcast_expires_at}
              prominent
              className="text-amber-900 dark:text-amber-100"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          {isPendingAcceptance && booking.parking_broadcast_expires_at && !myBroadcastPending && (
            <ParkingBroadcastCountdown expiresAt={booking.parking_broadcast_expires_at} />
          )}
        </div>

        <ParkingStaySummary
          checkIn={booking.check_in_date}
          checkOut={booking.check_out_date}
          organizationName={org.name}
        />

        {myBroadcastPending && (
          <div className="space-y-2">
            <label htmlFor="endorsement-note" className="text-foreground text-sm font-medium">
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

        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Email" value={booking.guest_email ?? '—'} icon={Mail} />
          <DetailField label="Phone" value={booking.guest_phone_number ?? '—'} icon={Phone} />
          <DetailField label="Plate" value={booking.car_plate_number ?? '—'} icon={Car} />
          <DetailField label="Vehicle" value={vehicleLabel} icon={Car} />
        </dl>
      </FloatingPanel>
    </AdminMobilePage>
  );
}
