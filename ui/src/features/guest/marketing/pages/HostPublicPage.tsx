import { useEffect } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { HostPublicHero } from '@/features/guest/marketing/hosts/components/HostPublicHero';
import { HostPublicParkingCard } from '@/features/guest/marketing/hosts/components/HostPublicParkingCard';
import { HostPublicPropertyCard } from '@/features/guest/marketing/hosts/components/HostPublicPropertyCard';
import { usePublicHost } from '@/features/guest/marketing/properties/hooks/usePublicHost';
import { GuestPublicBrandShell } from '@/features/guest/marketing/shared/components/GuestPublicBrandShell';
import { useMarketingBrandColor } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';

import { publicPageTitle, usePageTitle } from '@/lib/pageTitle';

function HostPublicPageSkeleton() {
  return (
    <div className="bg-background min-h-screen pb-16 pt-20 sm:pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className="bg-muted h-28 w-28 shrink-0 animate-pulse rounded-full sm:h-32 sm:w-32" />
          <div className="w-full max-w-md space-y-3 sm:max-w-none sm:pt-2">
            <div className="bg-muted mx-auto h-8 w-48 animate-pulse rounded-lg sm:mx-0" />
            <div className="bg-muted mx-auto h-5 w-40 animate-pulse rounded sm:mx-0" />
            <div className="bg-muted mx-auto h-4 w-64 animate-pulse rounded sm:mx-0" />
            <div className="bg-muted h-16 w-full animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="mt-12 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4 sm:mt-14">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2" aria-hidden>
              <div className="bg-muted aspect-square animate-pulse rounded-xl" />
              <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
              <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function listingCountLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export function HostPublicPage() {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  const { data: host, isLoading, isError } = usePublicHost(orgSlug);
  usePageTitle(publicPageTitle(host?.name ? `${host.name}` : 'Host'));
  const { setBrandColor } = useMarketingBrandColor();

  useEffect(() => {
    setBrandColor(host?.brandColor ?? null);
    return () => setBrandColor(null);
  }, [host?.brandColor, setBrandColor]);

  if (!orgSlug) {
    return <Navigate to="/properties" replace />;
  }

  if (!isLoading && (isError || !host)) {
    return <Navigate to="/properties" replace />;
  }

  if (isLoading || !host) {
    return <HostPublicPageSkeleton />;
  }

  const parkings = host.parkings ?? [];
  const hasHomes = host.properties.length > 0;
  const hasParkings = parkings.length > 0;

  return (
    <GuestPublicBrandShell brandColor={host.brandColor}>
      <div className="bg-background min-h-screen pb-16 pt-20 sm:pb-20">
        <HostPublicHero host={host} className="pt-8 sm:pt-16" />

        {hasHomes || hasParkings ? (
          <div className="mx-auto mt-10 max-w-6xl space-y-10 px-4 sm:mt-12 sm:space-y-12 sm:px-6 lg:mt-14">
            {hasHomes ? (
              <section>
                <div className="border-border mb-6 border-t pt-8 sm:mb-8 sm:pt-10">
                  <h2 className="text-foreground text-lg font-bold sm:text-xl">
                    {listingCountLabel(host.properties.length, 'home', 'homes')}
                  </h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-4 gap-y-8">
                  {host.properties.map((property, index) => (
                    <HostPublicPropertyCard key={property.slug} property={property} index={index} />
                  ))}
                </div>
              </section>
            ) : null}

            {hasParkings ? (
              <section>
                <div
                  className={
                    hasHomes ? 'mb-6 sm:mb-8' : 'border-border mb-6 border-t pt-8 sm:mb-8 sm:pt-10'
                  }
                >
                  <h2 className="text-foreground text-lg font-bold sm:text-xl">
                    {listingCountLabel(parkings.length, 'parking', 'parkings')}
                  </h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-4 gap-y-8">
                  {parkings.map((parking, index) => (
                    <HostPublicParkingCard key={parking.slug} parking={parking} index={index} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </GuestPublicBrandShell>
  );
}
