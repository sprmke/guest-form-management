import { useState } from 'react';

import { GalleryLightbox } from '@/features/guest/marketing/shared/components/GalleryLightbox';
import { cn } from '@/lib/utils';

export function ShowcaseGalleryStrip({
  images,
  propertyName,
  className,
  imageClassName,
}: {
  images: string[];
  propertyName: string;
  className?: string;
  imageClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <>
      <div
        className={cn('flex gap-3 overflow-x-auto pb-2', className)}
        role="region"
        aria-label={`${propertyName} photos`}
      >
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            className={cn(
              '@sm:h-72 @sm:w-96 group relative h-48 w-[min(100%,18rem)] shrink-0 overflow-hidden',
              'focus-visible:ring-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              imageClassName
            )}
            aria-label={`View photo ${i + 1} of ${images.length}`}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15" />
          </button>
        ))}
      </div>
      <GalleryLightbox
        images={images}
        altPrefix={propertyName}
        open={open}
        index={index}
        onClose={() => setOpen(false)}
        onIndexChange={setIndex}
      />
    </>
  );
}
