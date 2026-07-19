import { withStorageUrlCacheBust } from '@/features/dashboard/bookings/lib/storageUrls';
import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';
import { StayGuideCheckInLocation } from '@/features/guest/stay-guide/components/StayGuideCheckInLocation';
import { StayGuideRichContent } from '@/features/guest/stay-guide/components/StayGuideRichContent';
import type { GuestStayGuideDto, StayGuideSectionDto } from '@/features/guest/stay-guide/lib/api';

import { cn } from '@/lib/utils';

interface StayGuideSectionProps {
  section: StayGuideSectionDto;
  propertyLocation?: GuestStayGuideDto['property']['location'];
  towerAndUnit?: string | null;
}

export function StayGuideSection({
  section,
  propertyLocation,
  towerAndUnit,
}: StayGuideSectionProps) {
  const hasImage = Boolean(section.imageUrl?.trim());
  const imageSrc = hasImage
    ? withStorageUrlCacheBust(section.imageUrl!, section.imageUpdatedAt || null)
    : null;
  const heading = section.displayHeading?.trim() || section.label;
  const showCheckInMap = section.key === 'check-in-instructions' && propertyLocation != null;

  return (
    <div className={cn(showCheckInMap && 'space-y-5 sm:space-y-6')}>
      <article
        className={cn(
          'border-border/60 bg-card overflow-hidden rounded-2xl border shadow-sm sm:rounded-3xl',
          imageSrc && 'lg:grid lg:grid-cols-2 lg:items-stretch'
        )}
      >
        {imageSrc ? (
          <div className="relative aspect-[16/10] w-full shrink-0 lg:aspect-auto lg:h-full lg:min-h-[280px]">
            <Image
              key={section.imageUpdatedAt ?? section.imageUrl}
              src={imageSrc}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10">
          <h2 className="text-primary text-2xl font-semibold tracking-tight sm:text-3xl">
            {heading}
          </h2>
          <div className="mt-5 sm:mt-6">
            <StayGuideRichContent html={section.html} />
          </div>
        </div>
      </article>

      {showCheckInMap ? (
        <StayGuideCheckInLocation location={propertyLocation} towerAndUnit={towerAndUnit} />
      ) : null}
    </div>
  );
}
