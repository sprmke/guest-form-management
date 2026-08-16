import { useCallback, useEffect, useMemo, useState } from 'react';

import { Navigate, useParams, useSearchParams } from 'react-router-dom';

import { motion } from 'framer-motion';

import { useGuestAuth } from '@/features/guest/auth/context/GuestAuthContext';
import { ContactHostSheet } from '@/features/guest/chat/components/ContactHostSheet';
import {
  clampBookingGuestCounts,
  resolveListingGuestCapacity,
  type BookingGuestCounts,
} from '@/features/guest/form/lib/guestCounts';
import {
  PropertyGallery,
  PropertyOverview,
  PropertyAmenities,
  PropertyLocation,
  PropertyRules,
  PropertyReviews,
  BookingCard,
  BookingCalendarModal,
  GuestBookingFormModal,
  SimilarProperties,
} from '@/features/guest/marketing/properties/components/property-detail';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';
import { usePropertyContactHost } from '@/features/guest/marketing/properties/hooks/usePropertyContactHost';
import { usePropertyReserve } from '@/features/guest/marketing/properties/hooks/usePropertyReserve';
import { usePublicPropertyDetail } from '@/features/guest/marketing/properties/hooks/usePublicPropertyDetail';
import { GuestPublicBrandShell } from '@/features/guest/marketing/shared/components/GuestPublicBrandShell';
import type { ListingHostInfo } from '@/features/guest/marketing/shared/components/ListingHostCard';
import { useMarketingBrandColor } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';

import { Button } from '@/components/ui/button';
import { publicPageTitle, usePageTitle } from '@/lib/pageTitle';
import { parseGuestInquiryDateRange, formatDateToYYYYMMDD } from '@/utils/format/dates';

export function PropertyDetailPage() {
  const { propertySlug = '' } = useParams<{ propertySlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: propertyData, isLoading, isError } = usePublicPropertyDetail(propertySlug);
  usePageTitle(publicPageTitle(propertyData?.name ? `${propertyData.name}` : 'Property'));
  const { setBrandColor } = useMarketingBrandColor();
  const { status, requireGuestAuth } = useGuestAuth();

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [bookingGuests, setBookingGuests] = useState<BookingGuestCounts>({
    adults: 2,
    children: 0,
  });

  const guestCapacity = useMemo(
    () =>
      propertyData
        ? resolveListingGuestCapacity(
            propertyData.guests,
            propertyData.maxAdults,
            propertyData.maxChildren
          )
        : null,
    [propertyData]
  );

  useEffect(() => {
    if (!guestCapacity) return;
    setBookingGuests((current) =>
      clampBookingGuestCounts(current, guestCapacity, guestCapacity.maxGuests)
    );
  }, [guestCapacity]);

  const handleDatesChange = useCallback((ci: Date | null, co: Date | null) => {
    setCheckIn(ci);
    setCheckOut(co);
  }, []);

  const openContactSheet = useCallback(() => {
    setContactSheetOpen(true);
  }, []);

  const handleContactHost = useCallback(() => {
    const resumeCheckIn = checkIn ? formatDateToYYYYMMDD(checkIn) : undefined;
    const resumeCheckOut = checkOut ? formatDateToYYYYMMDD(checkOut) : undefined;

    const open = () => openContactSheet();

    if (status === 'authenticated') {
      open();
      return;
    }

    requireGuestAuth(open, {
      resume: {
        type: 'contact_host_sheet',
        propertySlug,
        checkInDate: resumeCheckIn,
        checkOutDate: resumeCheckOut,
      },
    });
  }, [checkIn, checkOut, openContactSheet, propertySlug, requireGuestAuth, status]);

  const openDatesForReserve = useCallback(() => {
    setCalendarOpen(true);
  }, []);

  const { reserve } = usePropertyReserve({
    propertySlug,
    checkIn,
    checkOut,
    adults: bookingGuests.adults,
    children: bookingGuests.children,
    onNeedDates: openDatesForReserve,
    onOpenForm: () => setFormModalOpen(true),
  });

  const { contactHost } = usePropertyContactHost({
    propertySlug,
    onContactHost: handleContactHost,
  });

  useEffect(() => {
    const fromUrl = parseGuestInquiryDateRange(
      searchParams.get('checkInDate'),
      searchParams.get('checkOutDate')
    );
    if (fromUrl) {
      setCheckIn(fromUrl.checkIn);
      setCheckOut(fromUrl.checkOut);
    }

    const adultsParam = searchParams.get('adults');
    const childrenParam = searchParams.get('children');
    if (guestCapacity && (adultsParam || childrenParam)) {
      setBookingGuests((current) => {
        const nextAdults = adultsParam ? Number(adultsParam) : current.adults;
        const nextChildren = childrenParam ? Number(childrenParam) : current.children;
        if (!Number.isFinite(nextAdults) || !Number.isFinite(nextChildren)) return current;
        return clampBookingGuestCounts(
          { adults: nextAdults, children: nextChildren },
          guestCapacity,
          guestCapacity.maxGuests
        );
      });
    }

    if (status === 'loading') return;

    const next = new URLSearchParams(searchParams);
    let shouldReplace = false;

    if (searchParams.get('contactHost') === 'open') {
      next.delete('contactHost');
      shouldReplace = true;
      if (status === 'authenticated') {
        setContactSheetOpen(true);
      }
    }

    if (searchParams.get('reserveForm') === 'open') {
      next.delete('reserveForm');
      shouldReplace = true;
      if (status === 'authenticated') {
        setFormModalOpen(true);
      }
    }

    if (shouldReplace) {
      setSearchParams(next, { replace: true });
    }
  }, [propertySlug, searchParams, setSearchParams, status, guestCapacity]);

  useEffect(() => {
    const pickDates = searchParams.get('pickDates');
    if (pickDates !== 'contactHost' && pickDates !== 'reserve') return;

    if (pickDates === 'contactHost') {
      handleContactHost();
    } else {
      setCalendarOpen(true);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('pickDates');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, handleContactHost]);

  useEffect(() => {
    setBrandColor(propertyData?.brandColor ?? null);
    return () => setBrandColor(null);
  }, [propertyData?.brandColor, setBrandColor]);

  if (!propertySlug) {
    return <Navigate to="/properties" replace />;
  }

  if (isLoading && !propertyData) {
    return (
      <div className="bg-background min-h-screen pb-20 pt-20">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-muted/40 h-8 w-40 animate-pulse rounded-lg" />
          <div className="bg-muted/40 mt-6 h-[280px] animate-pulse rounded-2xl sm:h-[420px]" />
          <div className="mt-8 space-y-4">
            <div className="bg-muted/40 h-10 w-2/3 animate-pulse rounded-lg" />
            <div className="bg-muted/40 h-24 animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !propertyData) {
    return <Navigate to="/properties" replace />;
  }

  const showReviews =
    (propertyData.source === 'mock' &&
      propertyData.rating != null &&
      propertyData.reviews != null) ||
    (propertyData.source === 'api' &&
      ((propertyData.reviews ?? 0) > 0 || (propertyData.guestReviews?.length ?? 0) > 0));

  const listingReviews =
    propertyData.guestReviews?.map((review) => ({
      id: review.id,
      author: review.author,
      date: review.date,
      rating: review.rating,
      comment: review.comment,
      feedbackTags: review.feedbackTags ?? [],
      media: review.media ?? [],
      source: review.source,
      helpful: 0,
    })) ?? [];

  const showRatingInBooking =
    (propertyData.source === 'mock' &&
      propertyData.rating != null &&
      propertyData.reviews != null) ||
    (propertyData.source === 'api' &&
      propertyData.rating != null &&
      (propertyData.reviews ?? 0) > 0);

  const contactSheetHost: ListingHostInfo = {
    organizationName: propertyData.host?.organizationName ?? 'Kame Homes',
    organizationSlug: propertyData.host?.organizationSlug ?? '',
    ownerName: propertyData.host?.ownerName ?? 'Host',
    ownerAvatarUrl: propertyData.host?.ownerAvatarUrl ?? null,
    organizationLogoUrl: propertyData.host?.organizationLogoUrl ?? null,
    isSuperhost: propertyData.isSuperhost,
    verifiedBadge: propertyData.verifiedBadge,
  };

  return (
    <GuestPublicBrandShell brandColor={propertyData.brandColor}>
      <div className="bg-background min-h-screen pb-20 pt-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <PropertyGallery
            images={propertyData.images}
            propertyName={propertyData.name}
            propertySlug={propertySlug}
          />
        </div>

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="space-y-10 lg:col-span-2">
              <PropertyOverview
                name={propertyData.name}
                type={propertyData.type}
                description={propertyData.description}
                location={{
                  address: propertyData.address,
                  city: propertyData.location.split(', ')[0] ?? '',
                  state: propertyData.state,
                  country: propertyData.country,
                }}
                stats={{
                  bedrooms: propertyData.bedrooms,
                  bathrooms: propertyData.bathrooms,
                  maxGuests: propertyData.guests,
                  floors: propertyData.floors,
                }}
                residenceName={propertyData.residenceName}
                developmentSlug={propertyData.developmentSlug}
                tower={propertyData.tower}
                unitNumber={propertyData.unitNumber}
                towerAndUnit={propertyData.towerAndUnit}
                checkInTime={propertyData.checkInTime}
                checkOutTime={propertyData.checkOutTime}
                rating={propertyData.rating}
                reviews={propertyData.reviews}
                isSuperhost={propertyData.isSuperhost}
                verifiedBadge={propertyData.verifiedBadge}
                recommendedBadge={propertyData.recommendedBadge}
                host={propertyData.host}
                selfCheckIn={propertyData.selfCheckIn}
                showMarketingFeatures={propertyData.source === 'mock'}
                cancellationPolicy={propertyData.cancellationPolicy}
                onContactHost={contactHost}
              />

              <hr className="border-border" />

              <PropertyAmenities amenities={propertyData.amenities} />

              <hr className="border-border" />

              <PropertyLocation
                address={propertyData.address}
                city={propertyData.location.split(', ')[0] ?? ''}
                state={propertyData.state}
                country={propertyData.country}
                zipCode={propertyData.zipCode}
                latitude={propertyData.latitude}
                longitude={propertyData.longitude}
                placeId={propertyData.placeId}
                showNearbyPlaces={propertyData.source === 'mock'}
              />

              <hr className="border-border" />

              <PropertyRules
                houseRules={propertyData.houseRules}
                maxGuests={propertyData.guests}
                cancellationPolicy={propertyData.cancellationPolicy}
                showSafetySection={propertyData.source === 'mock'}
              />

              {showReviews ? (
                <>
                  <hr className="border-border" />
                  <PropertyReviews
                    rating={propertyData.rating ?? 5}
                    totalReviews={propertyData.reviews ?? listingReviews.length}
                    reviews={propertyData.source === 'api' ? listingReviews : undefined}
                  />
                </>
              ) : null}
            </div>

            <div className="hidden lg:block">
              <BookingCard
                baseRate={propertyData.pricing.baseRate}
                currency={propertyData.pricing.currency}
                cleaningFee={propertyData.pricing.cleaningFee}
                securityDeposit={propertyData.pricing.securityDeposit}
                parkingRate={propertyData.pricing.parkingRate}
                petFee={propertyData.pricing.petFee}
                rating={showRatingInBooking ? propertyData.rating : undefined}
                reviews={showRatingInBooking ? propertyData.reviews : undefined}
                maxGuests={propertyData.guests}
                maxAdults={propertyData.maxAdults}
                maxChildren={propertyData.maxChildren}
                adults={bookingGuests.adults}
                childCount={bookingGuests.children}
                onGuestsChange={setBookingGuests}
                propertySlug={propertySlug}
                propertyName={propertyData.name}
                checkIn={checkIn}
                checkOut={checkOut}
                onDatesChange={handleDatesChange}
                calendarOpen={calendarOpen}
                onCalendarOpenChange={setCalendarOpen}
                onReserve={reserve}
              />
            </div>
          </div>

          <div className="mt-16">
            <hr className="border-border mb-10" />
            <SimilarProperties properties={mockProperties} currentPropertyId={propertySlug} />
          </div>
        </div>

        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t p-4 backdrop-blur-lg lg:hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-foreground text-lg font-bold">
                  ₱{propertyData.pricing.baseRate.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">/ night</span>
              </div>
              {showRatingInBooking ? (
                <p className="text-muted-foreground text-sm">
                  {propertyData.rating} ★ · {propertyData.reviews} reviews
                </p>
              ) : null}
            </div>
            <Button size="lg" className="rounded-full px-8" type="button" onClick={reserve}>
              Reserve
            </Button>
          </div>
        </motion.div>

        <BookingCalendarModal
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          propertySlug={propertySlug}
          propertyName={propertyData.name}
          checkIn={checkIn}
          checkOut={checkOut}
          onDatesChange={handleDatesChange}
        />

        <GuestBookingFormModal
          open={formModalOpen}
          onOpenChange={setFormModalOpen}
          propertySlug={propertySlug}
          propertyName={propertyData.name}
          checkIn={checkIn}
          checkOut={checkOut}
          numberOfAdults={bookingGuests.adults}
          numberOfChildren={bookingGuests.children}
        />

        <ContactHostSheet
          open={contactSheetOpen}
          onOpenChange={setContactSheetOpen}
          propertySlug={propertySlug}
          propertyName={propertyData.name}
          checkIn={checkIn}
          checkOut={checkOut}
          onDatesChange={handleDatesChange}
          host={contactSheetHost}
        />
      </div>
    </GuestPublicBrandShell>
  );
}
