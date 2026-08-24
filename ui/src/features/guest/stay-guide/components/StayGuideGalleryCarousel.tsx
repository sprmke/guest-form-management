import { useState } from 'react';

import { GalleryLightbox } from '@/features/guest/marketing/shared/components/GalleryLightbox';
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
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) return null;

  return (
    <div id="stay-guide-gallery" data-page-editor-anchor="stay-guide-gallery" className={className}>
      <div className="@2xl:px-6 @5xl:px-8 mx-auto max-w-[720px] px-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#737373] dark:text-[#A3A3A3]">
          Gallery
        </p>
      </div>
      <div
        className="@2xl:px-6 @5xl:px-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label={`${propertyName} photos`}
      >
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => {
              setLightboxIndex(index);
              setLightboxOpen(true);
            }}
            className="@2xl:h-48 @2xl:w-72 relative h-40 w-56 shrink-0 snap-start overflow-hidden rounded-2xl"
            aria-label={`View ${propertyName} photo ${index + 1}`}
          >
            <Image
              src={image}
              alt={`${propertyName} — photo ${index + 1}`}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 288px, 224px"
            />
          </button>
        ))}
      </div>

      <GalleryLightbox
        images={images}
        altPrefix={propertyName}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
