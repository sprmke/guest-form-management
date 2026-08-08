import { useState, type ReactNode } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Grid3X3, Share2 } from 'lucide-react';

import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';
import { LISTING_PLACEHOLDER_PROPERTY } from '@/features/guest/marketing/shared/lib/mockListingImages';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  images: string[];
  listingName: string;
  /** Optional slot rendered next to Share (e.g. property save button). */
  actionSlot?: ReactNode;
  placeholderSrc?: string;
};

export function ListingGallery({
  images,
  listingName,
  actionSlot,
  placeholderSrc = LISTING_PLACEHOLDER_PROPERTY,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayImages = images.length > 0 ? images : [placeholderSrc];
  const imageCount = displayImages.length;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const GalleryImage = ({
    src,
    index,
    className,
    sizes = '50vw',
    showOverlay = false,
    overlayContent,
  }: {
    src: string;
    index: number;
    className?: string;
    sizes?: string;
    showOverlay?: boolean;
    overlayContent?: React.ReactNode;
  }) => (
    <div
      className={cn('group relative cursor-pointer overflow-hidden', className)}
      onClick={() => openLightbox(index)}
    >
      <Image
        src={src}
        alt={`${listingName} - ${index + 1}`}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes={sizes}
      />
      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
      {showOverlay && overlayContent}
    </div>
  );

  const Layout1Image = () => (
    <div className="grid h-[300px] gap-2 overflow-hidden rounded-2xl sm:h-[400px] md:h-[500px]">
      <GalleryImage src={displayImages[0] ?? ''} index={0} />
    </div>
  );

  const Layout2Images = () => (
    <div className="grid h-[300px] grid-cols-1 gap-2 overflow-hidden rounded-2xl sm:h-[400px] md:h-[500px] md:grid-cols-5">
      <GalleryImage src={displayImages[0] ?? ''} index={0} className="md:col-span-3" />
      <GalleryImage
        src={displayImages[1] ?? ''}
        index={1}
        className="hidden md:col-span-2 md:block"
      />
    </div>
  );

  const Layout3Images = () => (
    <div className="grid h-[300px] grid-cols-1 gap-2 overflow-hidden rounded-2xl sm:h-[400px] md:h-[500px] md:grid-cols-2 md:grid-rows-2">
      <GalleryImage src={displayImages[0] ?? ''} index={0} className="md:row-span-2" />
      <GalleryImage src={displayImages[1] ?? ''} index={1} className="hidden md:block" />
      <GalleryImage src={displayImages[2] ?? ''} index={2} className="hidden md:block" />
    </div>
  );

  const Layout4Images = () => (
    <div className="grid h-[300px] grid-cols-1 gap-2 overflow-hidden rounded-2xl sm:h-[400px] md:h-[500px] md:grid-cols-3 md:grid-rows-2">
      <GalleryImage
        src={displayImages[0] ?? ''}
        index={0}
        className="md:col-span-2 md:row-span-2"
      />
      <GalleryImage src={displayImages[1] ?? ''} index={1} className="hidden md:block" />
      <div className="hidden gap-2 md:grid md:grid-cols-2">
        <GalleryImage src={displayImages[2] ?? ''} index={2} />
        <GalleryImage src={displayImages[3] ?? ''} index={3} />
      </div>
    </div>
  );

  const Layout5PlusImages = () => (
    <div className="grid h-[300px] grid-cols-1 gap-2 overflow-hidden rounded-2xl sm:h-[400px] md:h-[500px] md:grid-cols-4 md:grid-rows-2">
      <GalleryImage
        src={displayImages[0] ?? ''}
        index={0}
        className="md:col-span-2 md:row-span-2"
      />
      <GalleryImage src={displayImages[1] ?? ''} index={1} className="hidden md:block" />
      <GalleryImage src={displayImages[2] ?? ''} index={2} className="hidden md:block" />
      <GalleryImage src={displayImages[3] ?? ''} index={3} className="hidden md:block" />
      <GalleryImage
        src={displayImages[4] ?? ''}
        index={4}
        className="hidden md:block"
        showOverlay={imageCount > 5}
        overlayContent={
          imageCount > 5 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition-colors group-hover:bg-black/60">
              <Button
                variant="secondary"
                className="gap-2 rounded-full shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(0);
                }}
              >
                <Grid3X3 className="h-4 w-4" />+{imageCount - 5} more
              </Button>
            </div>
          )
        }
      />
    </div>
  );

  const renderGallery = () => {
    switch (imageCount) {
      case 1:
        return <Layout1Image />;
      case 2:
        return <Layout2Images />;
      case 3:
        return <Layout3Images />;
      case 4:
        return <Layout4Images />;
      default:
        return <Layout5PlusImages />;
    }
  };

  return (
    <>
      <div className="relative">
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-background/90 hover:bg-background gap-2 rounded-full backdrop-blur-sm"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({
                  title: listingName,
                  url: window.location.href,
                });
              }
            }}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          {actionSlot}
        </div>

        {renderGallery()}

        {imageCount > 1 ? (
          <Button
            variant="secondary"
            size="sm"
            className="bg-background/90 absolute bottom-4 right-4 gap-2 rounded-full backdrop-blur-sm md:hidden"
            onClick={() => openLightbox(0)}
          >
            <Grid3X3 className="h-4 w-4" />
            {imageCount} photos
          </Button>
        ) : null}
      </div>

      <AnimatePresence>
        {lightboxOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Close gallery"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
              {currentIndex + 1} / {displayImages.length}
            </div>

            {imageCount > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative h-[80vh] w-[90vw]"
            >
              <Image
                src={displayImages[currentIndex] ?? ''}
                alt={`${listingName} - ${currentIndex + 1}`}
                fill
                className="object-contain"
              />
            </motion.div>

            {imageCount > 1 ? (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-lg bg-white/10 p-2 backdrop-blur-sm">
                {displayImages.slice(0, 8).map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'relative h-12 w-16 overflow-hidden rounded-md transition-all',
                      currentIndex === index ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                    )}
                    aria-label={`View photo ${index + 1}`}
                  >
                    <Image src={image} alt="" fill className="object-cover" />
                  </button>
                ))}
                {displayImages.length > 8 ? (
                  <div className="flex h-12 w-16 items-center justify-center rounded-md bg-white/20 text-sm text-white">
                    +{displayImages.length - 8}
                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
