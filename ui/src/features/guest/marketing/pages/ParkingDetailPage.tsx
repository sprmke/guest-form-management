import { useEffect, useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { motion } from 'framer-motion';

import {
  BookingCard,
  PropertyAmenities,
  PropertyLocation,
} from '@/features/guest/marketing/properties/components/property-detail';
import { BookingCalendarModal } from '@/features/guest/marketing/properties/components/property-detail/BookingCalendarModal';
import { usePublicHost } from '@/features/guest/marketing/properties/hooks/usePublicHost';
import { ParkingOverview } from '@/features/guest/marketing/parkings/components/ParkingOverview';
import { ParkingPublicBrandShell } from '@/features/guest/marketing/parkings/components/ParkingPublicBrandShell';
import { resolvePublicDevelopment } from '@/features/guest/marketing/developments/lib/resolvePublicDevelopment';
import { usePublicParkingDetail } from '@/features/guest/marketing/parkings/hooks/usePublicParkingDetail';
import { useParkingReserve } from '@/features/guest/marketing/parkings/hooks/useParkingReserve';
import { ListingGallery } from '@/features/guest/marketing/shared/components/ListingGallery';
import type { ListingHostInfo } from '@/features/guest/marketing/shared/components/ListingHostCard';
import { useMarketingBrandColor } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';

import { Button } from '@/components/ui/button';

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
      <div className="bg-background min-h-screen pb-20 pt-24">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-muted/40 h-[280px] animate-pulse rounded-2xl sm:h-[420px]" />
          <div className="mt-8 space-y-4">
            <div className="bg-muted/40 h-10 w-2/3 animate-pulse rounded-lg" />
            <div className="bg-muted/40 h-24 animate-pulse rounded-2xl" />
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
      <div className="bg-background min-h-screen pb-20 pt-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ListingGallery images={galleryImages} listingName={data.name} />
        </div>

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="space-y-10 lg:col-span-2">
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

            <div className="hidden lg:block">
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
          className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t p-4 backdrop-blur-lg lg:hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-foreground text-lg font-bold">
                  {formatRate(pricing.weekdayNightlyRate)}
                </span>
                <span className="text-muted-foreground text-sm">/ night</span>
              </div>
            </div>
            <Button size="lg" className="rounded-full px-8" type="button" onClick={reserve}>
              Reserve
            </Button>
          </div>
        </motion.div>
      </div>
    </ParkingPublicBrandShell>
  );
}
