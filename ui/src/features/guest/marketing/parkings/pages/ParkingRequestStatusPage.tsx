import { Link, Navigate, useParams } from 'react-router-dom';

import { ArrowLeft, XCircle } from 'lucide-react';

import { FormPageToolbar } from '@/features/guest/marketing/forms/components/FormPageToolbar';
import { ParkingRequestStatusView } from '@/features/guest/marketing/parkings/components/ParkingRequestStatusView';
import { useParkingBookingStatus } from '@/features/guest/marketing/parkings/hooks/useParkingBookingStatus';
import { useParkingRequestCountdown } from '@/features/guest/marketing/parkings/hooks/useParkingRequestCountdown';

import { ParkingRequestStatusPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/lib/pageTitle';

export function ParkingRequestStatusPage() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const { data, isLoading, isError, refetch, isRefetching } = useParkingBookingStatus(bookingId);
  const countdown = useParkingRequestCountdown(data?.expiresAt ?? null);

  usePageTitle('Kame Homes - Parking Request');

  if (!bookingId) {
    return <Navigate to="/parkings" replace />;
  }

  if (isLoading && !data) {
    return <ParkingRequestStatusPageSkeleton toolbar={<FormPageToolbar />} />;
  }

  if (isError || !data) {
    return (
      <div className="bg-background min-h-screen pb-16 pt-16">
        <FormPageToolbar />
        <div className="container mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-2xl">
            <XCircle className="text-muted-foreground h-7 w-7" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-lg font-semibold">Request not found</p>
            <p className="text-muted-foreground text-sm">
              This may be a temporary connection issue.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              Try again
            </Button>
            <Button asChild variant="default" className="min-h-[44px] flex-1">
              <Link to="/parkings">Browse Parking</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20 pt-16">
      <FormPageToolbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <Link
            to="/parkings"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to parking
          </Link>
          <ParkingRequestStatusView data={data} countdown={countdown} isRefetching={isRefetching} />
        </div>
      </div>
    </div>
  );
}
