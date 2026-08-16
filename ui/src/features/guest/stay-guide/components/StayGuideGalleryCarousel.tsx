import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';

interface StayGuideGalleryCarouselProps {
  images: string[];
  propertyName: string;
  className?: string;
}

/** Editorial horizontal film-strip — native scroll-snap, no swipe/auto-advance chrome. */
export function StayGuideGalleryCarousel({
  images,
  propertyName,
  className,
}: StayGuideGalleryCarouselProps) {
  if (images.length === 0) return null;

  return (
    <div className={className}>
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#737373] dark:text-[#A3A3A3]">
          Gallery
        </p>
      </div>
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label={`${propertyName} photos`}
      >
        {images.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className="relative h-40 w-56 shrink-0 snap-start overflow-hidden rounded-2xl sm:h-48 sm:w-72"
          >
            <Image
              src={image}
              alt={`${propertyName} — photo ${index + 1}`}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 288px, 224px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
