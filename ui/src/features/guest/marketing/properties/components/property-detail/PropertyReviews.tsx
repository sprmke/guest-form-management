import { useState } from 'react';

import { motion } from 'framer-motion';
import { Star, ThumbsUp, ChevronRight, Search } from 'lucide-react';

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

export function PropertyReviews({ rating = 4.9, totalReviews = 0, reviews }: PropertyReviewsProps) {
  const resolvedReviews = reviews ?? (totalReviews > 0 ? mockReviews : []);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        {displayedReviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className="border-border border-b pb-6 last:border-0"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="from-primary to-primary/80 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white">
                  {review.author.charAt(0)}
                </div>
                <div>
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
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i < review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
            </div>

            {review.feedbackTags && review.feedbackTags.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {review.feedbackTags.map((tagId) => (
                  <span
                    key={tagId}
                    className="border-border bg-muted/50 text-foreground rounded-full border px-3 py-1 text-xs font-medium"
                  >
                    {guestReviewFeedbackTagLabel(tagId)}
                  </span>
                ))}
              </div>
            ) : null}

            {review.comment ? <p className="text-muted-foreground mb-3">{review.comment}</p> : null}

            <button className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
              <ThumbsUp className="h-4 w-4" />
              Helpful ({review.helpful})
            </button>
          </motion.div>
        ))}
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
    </motion.section>
  );
}
