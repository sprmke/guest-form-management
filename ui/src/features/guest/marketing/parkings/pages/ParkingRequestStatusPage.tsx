import { useEffect, useState } from 'react';

import { Link, Navigate, useParams } from 'react-router-dom';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { ParkingPublicBrandShell } from '@/features/guest/marketing/parkings/components/ParkingPublicBrandShell';
import {
  useParkingBookingStatus,
  type ParkingBookingStatusValue,
} from '@/features/guest/marketing/parkings/hooks/useParkingBookingStatus';

import { GuestFormPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  ParkingBookingStatusValue,
  { label: string; tone: 'waiting' | 'accepted' | 'ended'; icon: typeof Clock }
> = {
  PENDING_HOST_ACCEPTANCE: { label: 'Waiting for a host', tone: 'waiting', icon: Clock },
  PENDING_REVIEW: { label: 'Accepted', tone: 'accepted', icon: CheckCircle2 },
  READY_FOR_CHECKIN: { label: 'Ready for check-in', tone: 'accepted', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', tone: 'accepted', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', tone: 'ended', icon: XCircle },
  NO_HOST_AVAILABLE: { label: 'No host available', tone: 'ended', icon: XCircle },
};

const TONE_STYLES: Record<'waiting' | 'accepted' | 'ended', string> = {
  waiting: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  ended: 'bg-muted text-muted-foreground',
};

function useCountdown(expiresAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return null;
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (remainingMs <= 0) return null;

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ParkingRequestStatusPage() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const { data, isLoading, isError } = useParkingBookingStatus(bookingId);
  const countdown = useCountdown(data?.expiresAt ?? null);

  if (!bookingId) {
    return <Navigate to="/parkings" replace />;
  }

  if (isLoading && !data) {
    return <GuestFormPageSkeleton title="Parking request" />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <XCircle className="text-muted-foreground h-8 w-8" aria-hidden />
        <p className="text-foreground font-medium">Request not found</p>
        <Button asChild variant="outline">
          <Link to="/parkings">Browse Parking</Link>
        </Button>
      </div>
    );
  }

  const meta = STATUS_META[data.status];

  return (
    <ParkingPublicBrandShell>
      <div className="bg-background min-h-screen pb-24 pt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-border bg-card mx-auto w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.10)] sm:p-8">
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
                TONE_STYLES[meta.tone]
              )}
            >
              <meta.icon className="h-4 w-4 motion-safe:animate-none" aria-hidden />
              {meta.label}
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                {data.checkInDate} to {data.checkOutDate}
              </p>
              {data.organizationName && (
                <p className="text-foreground text-sm font-medium">{data.organizationName}</p>
              )}
            </div>

            {data.status === 'PENDING_HOST_ACCEPTANCE' && countdown && (
              <p className="text-muted-foreground text-sm tabular-nums">Expires in {countdown}</p>
            )}

            {data.parkingLabel &&
              ['PENDING_REVIEW', 'READY_FOR_CHECKIN', 'COMPLETED'].includes(data.status) && (
                <p className="text-foreground text-sm">Slot: {data.parkingLabel}</p>
              )}

            {data.endorsementNote && (
              <div className="border-border bg-muted/40 rounded-xl border p-4">
                <p className="text-foreground text-sm">{data.endorsementNote}</p>
              </div>
            )}

            {data.status === 'NO_HOST_AVAILABLE' && (
              <p className="text-muted-foreground text-sm">
                No host was available for these dates. Try another listing or contact us for help.
              </p>
            )}

            <Button asChild variant="outline" className="w-full">
              <Link to="/parkings">Browse Parking</Link>
            </Button>
          </div>
        </div>
      </div>
    </ParkingPublicBrandShell>
  );
}
