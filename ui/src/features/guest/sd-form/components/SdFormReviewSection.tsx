import { useEffect, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

import { GuestReviewFeedbackPills } from '@/features/guest/sd-form/components/GuestReviewFeedbackPills';
import {
  GuestReviewMediaUpload,
  guestReviewMediaFiles,
  type GuestReviewMediaItem,
} from '@/features/guest/sd-form/components/GuestReviewMediaUpload';
import { submitGuestReview } from '@/features/guest/sd-form/lib/api';
import { filterGuestReviewTagsForRating } from '@/features/guest/sd-form/lib/guestReviewFeedbackTags';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

export interface SdFormReviewSectionProps {
  bookingId: string;
  awaitingBalanceSettlement: boolean;
  onReviewSubmitted: () => void;
}

export function SdFormReviewSection({
  bookingId,
  awaitingBalanceSettlement,
  onReviewSubmitted,
}: SdFormReviewSectionProps) {
  const [starRating, setStarRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [feedbackTagIds, setFeedbackTagIds] = useState<string[]>([]);
  const [mediaItems, setMediaItems] = useState<GuestReviewMediaItem[]>([]);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    setFeedbackTagIds((prev) => filterGuestReviewTagsForRating(starRating, prev));
  }, [starRating]);

  const submitMut = useMutation({
    mutationFn: async () => {
      await submitGuestReview({
        bookingId,
        starRating,
        reviewText,
        feedbackTags: feedbackTagIds,
        media: guestReviewMediaFiles(mediaItems),
      });
    },
    onSuccess: () => {
      toast.success('Thanks for your review');
      onReviewSubmitted();
    },
    onError: (err: Error) => {
      toast.error(friendlyToastError(err, 'Could not submit review'));
    },
  });

  const displayRating = hoverRating || starRating;

  return (
    <section aria-labelledby="sd-review-heading" className="space-y-6">
      <div className="border-primary/10 from-primary/[0.04] via-card to-muted/15 flex flex-col items-center gap-4 rounded-xl border bg-gradient-to-b px-4 py-6 sm:px-6">
        <div className="space-y-1 text-center">
          <p
            id="sd-review-heading"
            className="text-muted-foreground text-xs font-bold uppercase tracking-wider"
          >
            Rating
          </p>
          {starRating > 0 ? (
            <p className="text-foreground text-sm font-semibold tabular-nums" aria-live="polite">
              {starRating} of 5
            </p>
          ) : null}
        </div>

        <div
          className="flex items-center justify-center gap-0.5 sm:gap-1"
          role="radiogroup"
          aria-label="Star rating"
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = value <= displayRating;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={starRating === value}
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-transform duration-150 motion-reduce:transition-none',
                  'hover:scale-110 active:scale-95 motion-reduce:transform-none',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                )}
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                onFocus={() => setHoverRating(value)}
                onBlur={() => setHoverRating(0)}
                onClick={() => setStarRating(value)}
              >
                <Star
                  className={cn(
                    'size-8 transition-colors duration-150 sm:size-9',
                    filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/35'
                  )}
                  strokeWidth={filled ? 0 : 1.5}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <GuestReviewFeedbackPills
        starRating={starRating}
        selectedTagIds={feedbackTagIds}
        onChange={setFeedbackTagIds}
        disabled={submitMut.isPending}
      />

      <div className="space-y-2">
        <Label htmlFor="sd-review-text" className="text-sm font-medium">
          Feedback
        </Label>
        <Textarea
          id="sd-review-text"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
          maxLength={2000}
          className="min-h-[120px] resize-y"
        />
      </div>

      <div className="space-y-3">
        <Label id="sd-review-media-label" className="text-sm font-medium">
          Photos
        </Label>
        <GuestReviewMediaUpload
          items={mediaItems}
          onChange={setMediaItems}
          disabled={submitMut.isPending}
        />
      </div>

      <Button
        type="button"
        className="shadow-primary/15 min-h-[48px] w-full shadow-md"
        disabled={starRating < 1 || submitMut.isPending}
        onClick={() => submitMut.mutate()}
      >
        {submitMut.isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Submitting…
          </>
        ) : awaitingBalanceSettlement ? (
          'Submit review'
        ) : (
          'Submit review & continue'
        )}
      </Button>
    </section>
  );
}
