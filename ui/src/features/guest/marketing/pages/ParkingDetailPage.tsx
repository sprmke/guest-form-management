import { useEffect, useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { motion } from 'framer-motion';

import { resolvePublicDevelopment } from '@/features/guest/marketing/developments/lib/resolvePublicDevelopment';
import { ParkingOverview } from '@/features/guest/marketing/parkings/components/ParkingOverview';
import { ParkingPublicBrandShell } from '@/features/guest/marketing/parkings/components/ParkingPublicBrandShell';
import { useParkingReserve } from '@/features/guest/marketing/parkings/hooks/useParkingReserve';
import { usePublicParkingDetail } from '@/features/guest/marketing/parkings/hooks/usePublicParkingDetail';
import {
  BookingCard,
  PropertyAmenities,
  PropertyLocation,
} from '@/features/guest/marketing/properties/components/property-detail';
import { BookingCalendarModal } from '@/features/guest/marketing/properties/components/property-detail/BookingCalendarModal';
import { usePublicHost } from '@/features/guest/marketing/properties/hooks/usePublicHost';
import { ListingGallery } from '@/features/guest/marketing/shared/components/ListingGallery';
import type { ListingHostInfo } from '@/features/guest/marketing/shared/components/ListingHostCard';
import { useMarketingBrandColor } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { publicPageTitle, usePageTitle } from '@/lib/pageTitle';

function formatRate(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function buildGalleryImages(coverImage: string | null, images: string[]): string[] {
  const merged = [coverImage, ...images].filter((url): url is string => Boolean(url?.trim()));
  return [...new Set(merged)];
}

export function ParkingDetailPage() {
  const { parkingSlug = '' } = useParams<{ parkingSlug: string }>();
  const { data, isLoading, isError } = usePublicParkingDetail(parkingSlug);
  usePageTitle(publicPageTitle(data?.name ? `${data.name}` : 'Parking'));
  const { data: hostProfile } = usePublicHost(data?.orgSlug ?? '');
  const { setBrandColor } = useMarketingBrandColor();

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { reserve } = useParkingReserve({
    parkingSlug,
    checkIn,
    checkOut,
    onNeedDates: () => setCalendarOpen(true),
  });

  const handleDatesChange = (ci: Date | null, co: Date | null) => {
    setCheckIn(ci);
    setCheckOut(co);
  };

  const galleryImages = useMemo(
    () => (data ? buildGalleryImages(data.coverImage, data.images) : []),
    [data]
  );

  useEffect(() => {
    setBrandColor(data?.brandColor ?? null);
    return () => setBrandColor(null);
  }, [data?.brandColor, setBrandColor]);

  if (!parkingSlug) {
    return <Navigate to="/parkings" replace />;
  }

  if (isLoading && !data) {
    return (
      <div className="@container bg-background min-h-screen w-full min-w-0 pb-20 pt-24">
        <div className="@xl:px-6 @5xl:px-8 container mx-auto px-4">
          <Skeleton className="@xl:h-[400px] @3xl:h-[500px] h-[280px] w-full rounded-2xl" />
        </div>

        <div className="@xl:px-6 @5xl:px-8 container mx-auto px-4 py-8">
          <div className="@5xl:grid-cols-3 @5xl:gap-12 grid grid-cols-1 gap-8">
            <div className="@5xl:col-span-2 min-w-0 space-y-10">
              <div className="space-y-4">
                <Skeleton className="h-8 w-2/3 rounded-lg" />
                <Skeleton className="h-4 w-1/3 rounded-full" />
                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>

              <hr className="border-border" />

              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-2/3 rounded-full" />
              </div>
            </div>

            <div className="@5xl:block hidden">
              <div className="border-border space-y-5 rounded-2xl border p-6 shadow-sm">
                <Skeleton className="h-7 w-32 rounded-lg" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <Navigate to="/parkings" replace />;
  }

  const pricing = data.pricing;

  const host: ListingHostInfo | null = hostProfile
    ? {
        organizationName: hostProfile.name,
        organizationSlug: hostProfile.slug,
        ownerName: hostProfile.ownerName,
        ownerAvatarUrl: hostProfile.ownerAvatarUrl,
        organizationLogoUrl: hostProfile.logoUrl,
        verifiedBadge: hostProfile.verifiedBadge,
      }
    : null;

  const development = resolvePublicDevelopment(data.residenceName);

  const hasLocation =
    Boolean(data.address.trim()) || (data.latitude != null && data.longitude != null);
  const locationCity = data.city.trim() || development?.locationLabel.split(',')[0]?.trim() || '';

  return (
    <ParkingPublicBrandShell brandColor={data.brandColor}>
      <div className="@container bg-background min-h-screen w-full min-w-0 pb-20 pt-24">
        <div className="@xl:px-6 @5xl:px-8 container mx-auto px-4">
          <ListingGallery images={galleryImages} listingName={data.name} />
        </div>

        <div className="@xl:px-6 @5xl:px-8 container mx-auto px-4 py-8">
          <div className="@5xl:grid-cols-3 @5xl:gap-12 grid grid-cols-1 gap-8">
            <div className="@5xl:col-span-2 min-w-0 space-y-10">
              <ParkingOverview
                name={data.name}
                parkingType={data.parkingType}
                residenceName={data.residenceName}
                tower={data.tower}
                level={data.level}
                slotLabel={data.slotLabel}
                description={data.description ?? data.notes}
                host={host}
                geoLocation={development?.locationLabel}
                spaceLengthM={data.spaceLengthM}
                spaceWidthM={data.spaceWidthM}
                heightClearanceM={data.heightClearanceM}
                checkInTime={data.checkInTime}
                checkOutTime={data.checkOutTime}
                recommendedBadge={data.recommendedBadge}
              />

              {data.features.length > 0 ? (
                <>
                  <hr className="border-border" />
                  <PropertyAmenities amenities={data.features} />
                </>
              ) : null}

              {hasLocation ? (
                <>
                  <hr className="border-border" />
                  <PropertyLocation
                    address={data.address}
                    city={locationCity}
                    state={data.province}
                    country={data.country}
                    zipCode={data.zipCode}
                    latitude={data.latitude}
                    longitude={data.longitude}
                    placeId={data.placeId}
                    showNearbyPlaces={false}
                  />
                </>
              ) : null}
            </div>

            <div className="@5xl:block hidden min-w-0">
              <BookingCard
                listingKind="parking"
                baseRate={pricing.weekdayNightlyRate}
                weekendNightlyRate={pricing.weekendNightlyRate}
                dateOverrides={pricing.dateOverrides}
                currency={pricing.currency}
                listingSlug={parkingSlug}
                listingName={data.name}
                checkIn={checkIn}
                checkOut={checkOut}
                onDatesChange={handleDatesChange}
                calendarOpen={calendarOpen}
                onCalendarOpenChange={setCalendarOpen}
              />
            </div>
          </div>
        </div>

        <BookingCalendarModal
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          propertySlug={parkingSlug}
          propertyName={data.name}
          checkIn={checkIn}
          checkOut={checkOut}
          onDatesChange={handleDatesChange}
        />

        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="border-border bg-background/95 @5xl:hidden fixed inset-x-0 bottom-0 z-40 border-t p-4 backdrop-blur-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-foreground text-lg font-bold">
                  {formatRate(pricing.weekdayNightlyRate)}
                </span>
                <span className="text-muted-foreground text-sm">/ night</span>
              </div>
            </div>
            <Button
              size="lg"
              className="min-h-[44px] shrink-0 rounded-full px-8"
              type="button"
              onClick={reserve}
            >
              Reserve
            </Button>
          </div>
        </motion.div>
      </div>
    </ParkingPublicBrandShell>
  );
}
