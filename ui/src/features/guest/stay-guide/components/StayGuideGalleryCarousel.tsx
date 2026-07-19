import { type MouseEvent as ReactMouseEvent, type SyntheticEvent, useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';
import { useSwipeCarousel } from '@/features/guest/stay-guide/hooks/useSwipeCarousel';

import { cn } from '@/lib/utils';

interface StayGuideGalleryCarouselProps {
  images: string[];
  propertyName: string;
  className?: string;
}

function stopCarouselControlEvent(event: SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function StayGuideGalleryCarousel({
  images,
  propertyName,
  className,
}: StayGuideGalleryCarouselProps) {
  const [isHovered, setIsHovered] = useState(false);
  const {
    isDragging,
    goPrevious,
    goNext,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    translateX,
  } = useSwipeCarousel(images.length, { paused: isHovered });

  const handleControlClick = (event: ReactMouseEvent<HTMLButtonElement>, action: () => void) => {
    stopCarouselControlEvent(event);
    action();
  };

  if (images.length === 0) {
    return (
      <div
        className={cn(
          'from-primary/20 via-primary/5 to-muted/40 flex w-full items-center justify-center bg-gradient-to-br',
          className
        )}
        aria-hidden
      >
        <span className="text-primary/35 text-7xl font-semibold tracking-tight">
          {propertyName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn('bg-muted group relative w-full touch-pan-y overflow-hidden', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${propertyName} photos`}
    >
      <div
        className={cn(
          'flex h-full w-full',
          isDragging ? 'transition-none' : 'transition-transform duration-700 ease-out'
        )}
        style={{ transform: `translateX(${translateX})` }}
      >
        {images.map((image, imageIndex) => (
          <div key={`${image}-${imageIndex}`} className="relative h-full w-full shrink-0">
            <Image
              src={image}
              alt={`${propertyName} — photo ${imageIndex + 1}`}
              fill
              className="object-cover"
              priority={imageIndex === 0}
              sizes="100vw"
            />
          </div>
        ))}
      </div>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            data-carousel-control
            onClick={(event) => handleControlClick(event, goPrevious)}
            className="absolute left-3 top-1/2 z-20 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/65 sm:left-4 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
            aria-label="Previous photo"
          >
            <ChevronLeft className="pointer-events-none h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            data-carousel-control
            onClick={(event) => handleControlClick(event, goNext)}
            className="absolute right-3 top-1/2 z-20 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/65 sm:right-4 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
            aria-label="Next photo"
          >
            <ChevronRight className="pointer-events-none h-5 w-5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
