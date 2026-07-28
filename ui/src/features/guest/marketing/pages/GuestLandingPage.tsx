import { Navigate, useSearchParams } from 'react-router-dom';

import { readGuestPropertySlug } from '@/features/guest/form/lib/guestPropertyScope';
import { guestCalendarPath } from '@/features/guest/lib/guestPublicPaths';
import { FeaturedProperties } from '@/features/guest/marketing/guest-landing/components/FeaturedProperties';
import { GuestHero } from '@/features/guest/marketing/guest-landing/components/GuestHero';
import { LandingSocialProof } from '@/features/guest/marketing/guest-landing/components/LandingSocialProof';
import { PopularDestinations } from '@/features/guest/marketing/guest-landing/components/PopularDestinations';

export function GuestLandingPage() {
  const [searchParams] = useSearchParams();
  const property = readGuestPropertySlug(searchParams);

  if (property) {
    const next = new URLSearchParams(searchParams);
    next.delete('property');
    next.delete('property_slug');
    return <Navigate to={guestCalendarPath(property, next)} replace />;
  }

  return (
    <>
      <GuestHero />
      <FeaturedProperties />
      <PopularDestinations />
      <LandingSocialProof />
    </>
  );
}
