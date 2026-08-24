import { MapPin, Navigation } from 'lucide-react';

import { PropertyMapEmbed } from '@/features/guest/marketing/properties/components/property-detail/PropertyMapEmbed';
import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StayGuideLocation = GuestStayGuideDto['property']['location'];

interface StayGuideCheckInLocationProps {
  location: StayGuideLocation;
  towerAndUnit?: string | null;
  className?: string;
}

function buildFullAddress(location: StayGuideLocation): string {
  return [location.address, location.city, location.province, location.zipCode, location.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

function hasMapTarget(location: StayGuideLocation, fullAddress: string): boolean {
  if (fullAddress) return true;
  return (
    typeof location.latitude === 'number' &&
    Number.isFinite(location.latitude) &&
    typeof location.longitude === 'number' &&
    Number.isFinite(location.longitude)
  );
}

function openDirections(location: StayGuideLocation, fullAddress: string) {
  const mapsUrl = location.mapsUrl?.trim();
  if (mapsUrl) {
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  if (
    typeof location.latitude === 'number' &&
    Number.isFinite(location.latitude) &&
    typeof location.longitude === 'number' &&
    Number.isFinite(location.longitude)
  ) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
    return;
  }

  if (fullAddress) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }
}

export function StayGuideCheckInLocation({
  location,
  towerAndUnit,
  className,
}: StayGuideCheckInLocationProps) {
  const fullAddress = buildFullAddress(location);
  if (!hasMapTarget(location, fullAddress)) return null;

  const areaLabel = [location.city, location.province, location.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');

  const streetLine = [location.address?.trim(), towerAndUnit?.trim()].filter(Boolean).join(' · ');

  return (
    <article
      className={cn(
        '@2xl:rounded-3xl overflow-hidden rounded-2xl border border-[#171717]/10 bg-white shadow-sm dark:border-[#FAFAFA]/10 dark:bg-[#0A0A0A]',
        className
      )}
    >
      <div className="@2xl:aspect-[16/9] relative aspect-[5/3] w-full">
        <PropertyMapEmbed
          latitude={location.latitude}
          longitude={location.longitude}
          placeId={location.placeId}
          address={fullAddress}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent"
          aria-hidden
        />
      </div>

      <div className="@2xl:p-6 @5xl:p-8 border-t border-[#171717]/10 p-5 dark:border-[#FAFAFA]/10">
        <div className="@2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6 flex flex-col gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="bg-primary/10 text-primary ring-primary/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              {areaLabel ? (
                <p className="text-primary @2xl:text-lg text-base font-semibold tracking-tight">
                  {areaLabel}
                </p>
              ) : null}
              {streetLine ? (
                <p className="@2xl:text-[15px] mt-1 text-sm leading-relaxed text-[#737373] dark:text-[#A3A3A3]">
                  {streetLine}
                </p>
              ) : fullAddress ? (
                <p className="@2xl:text-[15px] mt-1 text-sm leading-relaxed text-[#737373] dark:text-[#A3A3A3]">
                  {fullAddress}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            onClick={() => openDirections(location, fullAddress)}
            className="@2xl:w-auto min-h-[44px] w-full shrink-0 gap-2 rounded-xl px-5"
          >
            <Navigation className="h-4 w-4" aria-hidden />
            Directions
          </Button>
        </div>
      </div>
    </article>
  );
}
