import { useEffect, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, Star, ThumbsUp, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { GuestDialogShell } from '@/features/guest/marketing/shared/components/GuestDialogShell';
import { guestReviewFeedbackTagLabel } from '@/features/guest/sd-form/lib/guestReviewFeedbackTags';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  author: string;
  avatar?: string;
  date: string;
  rating: number;
  comment: string;
  helpful: number;
  source?: 'kame' | 'facebook' | 'airbnb';
  feedbackTags?: string[];
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  categories?: {
    cleanliness?: number;
    accuracy?: number;
    communication?: number;
    location?: number;
    checkin?: number;
    value?: number;
  };
}

interface PropertyReviewsProps {
  rating: number;
  totalReviews: number;
  reviews?: Review[];
}

const ratingCategories = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'communication', label: 'Communication' },
  { key: 'location', label: 'Location' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'value', label: 'Value' },
];

// Mock reviews data
const mockReviews: Review[] = [
  {
    id: '1',
    author: 'Maria Santos',
    date: 'January 2026',
    rating: 5,
    comment:
      'Amazing place! The view was breathtaking and the host was incredibly responsive. Everything was clean and exactly as described. Would definitely stay again!',
    helpful: 12,
    categories: {
      cleanliness: 5,
      accuracy: 5,
      communication: 5,
      location: 5,
      checkin: 5,
      value: 5,
    },
  },
  {
    id: '2',
    author: 'John Reyes',
    date: 'January 2026',
    rating: 5,
    comment:
      "Perfect getaway spot! The amenities were top-notch and the location couldn't be better. Highly recommend for families.",
    helpful: 8,
    categories: {
      cleanliness: 5,
      accuracy: 5,
      communication: 5,
      location: 5,
      checkin: 4,
      value: 5,
    },
  },
  {
    id: '3',
    author: 'Sarah Chen',
    date: 'December 2025',
    rating: 4,
    comment:
      'Great property with beautiful surroundings. Minor issue with hot water but was resolved quickly. Overall a wonderful experience.',
    helpful: 5,
    categories: {
      cleanliness: 4,
      accuracy: 4,
      communication: 5,
      location: 5,
      checkin: 5,
      value: 4,
    },
  },
  {
    id: '4',
    author: 'Michael Torres',
    date: 'December 2025',
    rating: 5,
    comment: "Exceeded all expectations! The photos don't do it justice. Will definitely be back!",
    helpful: 15,
    categories: {
      cleanliness: 5,
      accuracy: 5,
      communication: 5,
      location: 5,
      checkin: 5,
      value: 5,
    },
  },
  {
    id: '5',
    author: 'Lisa Garcia',
    date: 'November 2025',
    rating: 5,
    comment:
      "One of the best stays we've ever had. Everything was perfect from check-in to check-out. The host thought of every detail.",
    helpful: 20,
    categories: {
      cleanliness: 5,
      accuracy: 5,
      communication: 5,
      location: 4,
      checkin: 5,
      value: 5,
    },
  },
];

const reviewSourceLabel = (source?: Review['source']) => {
  switch (source) {
    case 'airbnb':
      return 'Airbnb';
    case 'facebook':
      return 'Facebook';
    case 'kame':
      return 'Kame guest';
    default:
      return null;
  }
};

function reviewImageUrls(review: Review): string[] {
  return (review.media ?? [])
    .filter((item) => item.type === 'image' && item.url.trim())
    .map((item) => item.url.trim());
}

function ReviewAuthorHeader({ review }: { review: Review }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="from-primary to-primary/80 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white">
          {review.author.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-foreground font-medium">{review.author}</p>
            {reviewSourceLabel(review.source) ? (
              <span className="border-border bg-muted/50 text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-medium">
                {reviewSourceLabel(review.source)}
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">{review.date}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-4 w-4',
              i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
    </div>
  );
}

function ReviewFeedbackTags({ review }: { review: Review }) {
  if (!review.feedbackTags?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {review.feedbackTags.map((tagId) => (
        <span
          key={tagId}
          className="border-border bg-muted/50 text-foreground rounded-full border px-3 py-1 text-xs font-medium"
        >
          {guestReviewFeedbackTagLabel(tagId)}
        </span>
      ))}
    </div>
  );
}

function ReviewPhotoGrid({
  urls,
  reviewId,
  onPhotoClick,
}: {
  urls: string[];
  reviewId: string;
  onPhotoClick: (index: number) => void;
}) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, mediaIndex) => (
        <button
          key={`${reviewId}-media-${mediaIndex}`}
          type="button"
          onClick={() => onPhotoClick(mediaIndex)}
          className="border-border bg-muted/30 block size-20 overflow-hidden rounded-lg border sm:size-24"
          aria-label={`View review photo ${mediaIndex + 1}`}
        >
          <img src={url} alt="" className="size-full object-cover" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function ReviewListComment({ comment, onSeeMore }: { comment: string; onSeeMore: () => void }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;

    const measure = () => {
      setIsClamped(node.scrollHeight > node.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [comment]);

  return (
    <div className="space-y-1">
      <p ref={textRef} className="text-muted-foreground line-clamp-2">
        {comment}
      </p>
      {isClamped ? (
        <button
          type="button"
          onClick={onSeeMore}
          className="text-foreground text-sm font-medium underline-offset-2 hover:underline"
        >
          See more
        </button>
      ) : null}
    </div>
  );
}

function ReviewDetailDialog({
  review,
  open,
  onOpenChange,
  onPhotoClick,
  dismissLocked,
}: {
  review: Review | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoClick: (urls: string[], index: number) => void;
  dismissLocked?: boolean;
}) {
  if (!review) return null;

  const photos = reviewImageUrls(review);

  return (
    <GuestDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Review"
      dismissLocked={dismissLocked}
      sizeClassName="max-w-[min(calc(100vw-1.5rem),36rem)] sm:max-w-[min(90vw,36rem)]"
      heightClassName="max-h-[min(90dvh,44rem)]"
      bodyClassName="space-y-4"
    >
      <ReviewAuthorHeader review={review} />
      <ReviewFeedbackTags review={review} />
      {review.comment ? (
        <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
          {review.comment}
        </p>
      ) : null}
      <ReviewPhotoGrid
        urls={photos}
        reviewId={review.id}
        onPhotoClick={(index) => onPhotoClick(photos, index)}
      />
    </GuestDialogShell>
  );
}

function ReviewPhotoLightbox({
  urls,
  index,
  onClose,
  onIndexChange,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const hasMultiple = urls.length > 1;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if (!hasMultiple) return;
      if (event.key === 'ArrowLeft') {
        onIndexChange(index === 0 ? urls.length - 1 : index - 1);
      }
      if (event.key === 'ArrowRight') {
        onIndexChange((index + 1) % urls.length);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [hasMultiple, index, onClose, onIndexChange, urls.length]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center bg-black p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Review photo"
      data-review-photo-lightbox=""
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="pointer-events-auto absolute right-4 top-4 z-10 flex size-11 min-h-[44px] min-w-[44px] items-center justify-center text-white/90 transition-colors hover:text-white"
        aria-label="Close photo"
      >
        <X className="size-6" aria-hidden />
      </button>

      {hasMultiple ? (
        <p className="absolute left-1/2 top-4 z-10 -translate-x-1/2 text-sm tabular-nums text-white/80">
          {index + 1} / {urls.length}
        </p>
      ) : null}

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange(index === 0 ? urls.length - 1 : index - 1);
            }}
            className="pointer-events-auto absolute left-4 top-1/2 z-10 flex size-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-white/90 transition-colors hover:text-white"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index + 1) % urls.length);
            }}
            className="pointer-events-auto absolute right-4 top-1/2 z-10 flex size-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-white/90 transition-colors hover:text-white"
            aria-label="Next photo"
          >
            <ChevronRight className="size-6" aria-hidden />
          </button>
        </>
      ) : null}

      <motion.img
        key={urls[index]}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        src={urls[index]}
        alt=""
        className="max-h-[min(85dvh,720px)] max-w-[min(92vw,960px)] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </motion.div>,
    document.body
  );
}

export function PropertyReviews({ rating = 4.9, totalReviews = 0, reviews }: PropertyReviewsProps) {
  const resolvedReviews = reviews ?? (totalReviews > 0 ? mockReviews : []);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [photoLightbox, setPhotoLightbox] = useState<{ urls: string[]; index: number } | null>(
    null
  );
  const [detailReview, setDetailReview] = useState<Review | null>(null);

  const displayedReviews = showAll ? resolvedReviews : resolvedReviews.slice(0, 4);

  // Calculate category averages
  const categoryAverages = ratingCategories.map((cat) => {
    const validReviews = resolvedReviews.filter(
      (r) => r.categories?.[cat.key as keyof typeof r.categories]
    );
    const avg =
      validReviews.reduce(
        (sum, r) => sum + (r.categories?.[cat.key as keyof typeof r.categories] || 0),
        0
      ) / (validReviews.length || 1);
    return { ...cat, avg: Number(avg.toFixed(1)) };
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="space-y-6"
    >
      {/* Rating Summary */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex items-center gap-3">
          <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
          <div>
            <span className="text-foreground text-4xl font-bold">{rating}</span>
            <p className="text-muted-foreground">{totalReviews} reviews</p>
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          {categoryAverages.map((cat) => (
            <div key={cat.key} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-sm">{cat.label}</span>
              <div className="flex items-center gap-2">
                <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                  <div
                    className="bg-foreground h-full rounded-full"
                    style={{ width: `${(cat.avg / 5) * 100}%` }}
                  />
                </div>
                <span className="text-foreground text-sm font-medium">{cat.avg}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Reviews */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-3 pl-10 pr-4 focus:outline-none focus:ring-2"
        />
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {displayedReviews.map((review, index) => {
          const photos = reviewImageUrls(review);

          return (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="border-border border-b pb-6 last:border-0"
            >
              <div className="mb-3">
                <ReviewAuthorHeader review={review} />
              </div>

              {review.feedbackTags && review.feedbackTags.length > 0 ? (
                <div className="mb-3">
                  <ReviewFeedbackTags review={review} />
                </div>
              ) : null}

              {review.comment ? (
                <div className="mb-3">
                  <ReviewListComment
                    comment={review.comment}
                    onSeeMore={() => setDetailReview(review)}
                  />
                </div>
              ) : null}

              {photos.length > 0 ? (
                <div className="mb-3">
                  <ReviewPhotoGrid
                    urls={photos}
                    reviewId={review.id}
                    onPhotoClick={(index) => setPhotoLightbox({ urls: photos, index })}
                  />
                </div>
              ) : null}

              <button className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
                <ThumbsUp className="h-4 w-4" />
                Helpful ({review.helpful})
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Show All Button */}
      {resolvedReviews.length > 4 && (
        <Button
          variant="outline"
          onClick={() => setShowAll(!showAll)}
          className="w-full gap-2 rounded-xl sm:w-auto"
        >
          {showAll ? 'Show less' : `Show all ${totalReviews} reviews`}
          <ChevronRight className={cn('h-4 w-4 transition-transform', showAll && 'rotate-90')} />
        </Button>
      )}

      <ReviewDetailDialog
        review={detailReview}
        open={detailReview != null}
        dismissLocked={photoLightbox != null}
        onOpenChange={(open) => {
          if (!open) setDetailReview(null);
        }}
        onPhotoClick={(urls, index) => setPhotoLightbox({ urls, index })}
      />

      <AnimatePresence>
        {photoLightbox ? (
          <ReviewPhotoLightbox
            urls={photoLightbox.urls}
            index={photoLightbox.index}
            onClose={() => setPhotoLightbox(null)}
            onIndexChange={(index) =>
              setPhotoLightbox((current) => (current ? { ...current, index } : current))
            }
          />
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
