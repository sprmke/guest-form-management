/**
 * External review proof — mirrors `supabase/functions/_shared/propertyExternalReviews.ts`.
 */

export const MAX_PROPERTY_EXTERNAL_REVIEWS = 5;

export type ExternalReviewSource = 'facebook' | 'airbnb';

export type ExternalReviewModerationStatus = 'pending' | 'approved' | 'rejected';

export type SuperhostStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type PropertyExternalReview = {
  id: string;
  source: ExternalReviewSource;
  reviewText: string;
  reviewerName: string;
  starRating: number | null;
  imageUrl: string | null;
  proofUrl: string | null;
  moderationStatus: ExternalReviewModerationStatus;
  createdAt: string | null;
};

export function createEmptyExternalReview(
  source: ExternalReviewSource = 'airbnb'
): PropertyExternalReview {
  return {
    id: crypto.randomUUID(),
    source,
    reviewText: '',
    reviewerName: '',
    starRating: 5,
    imageUrl: null,
    proofUrl: null,
    moderationStatus: 'pending',
    createdAt: null,
  };
}

export function normalizeExternalReviewsDraft(raw: unknown): PropertyExternalReview[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_PROPERTY_EXTERNAL_REVIEWS).map((item) => {
    const row = (item ?? {}) as Partial<PropertyExternalReview>;
    const source = row.source === 'facebook' || row.source === 'airbnb' ? row.source : 'airbnb';
    const star =
      row.starRating == null
        ? null
        : Math.min(5, Math.max(1, Math.round(Number(row.starRating)) || 5));
    return {
      id: row.id?.trim() || crypto.randomUUID(),
      source,
      reviewText: row.reviewText?.trim() ?? '',
      reviewerName: row.reviewerName?.trim() ?? '',
      starRating: star,
      imageUrl: row.imageUrl?.trim() || null,
      proofUrl: row.proofUrl?.trim() || null,
      moderationStatus:
        row.moderationStatus === 'approved' || row.moderationStatus === 'rejected'
          ? row.moderationStatus
          : 'pending',
      createdAt: row.createdAt?.trim() || null,
    };
  });
}

export function externalReviewsEqual(
  a: PropertyExternalReview[],
  b: PropertyExternalReview[]
): boolean {
  if (a.length !== b.length) return false;
  const sortKey = (review: PropertyExternalReview) => review.id;
  const sortedA = [...a].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  const sortedB = [...b].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  return sortedA.every((review, index) => {
    const other = sortedB[index];
    return (
      review.id === other.id &&
      review.source === other.source &&
      review.reviewText === other.reviewText &&
      review.reviewerName === other.reviewerName &&
      review.starRating === other.starRating &&
      (review.imageUrl ?? '') === (other.imageUrl ?? '') &&
      (review.proofUrl ?? '') === (other.proofUrl ?? '')
    );
  });
}

export function externalReviewSourceLabel(source: ExternalReviewSource): string {
  return source === 'airbnb' ? 'Airbnb' : 'Facebook';
}

export function superhostStatusLabel(status: SuperhostStatus): string {
  switch (status) {
    case 'approved':
      return 'Verified Superhost';
    case 'pending':
      return 'Pending verification';
    case 'rejected':
      return 'Not verified';
    default:
      return 'Not submitted';
  }
}

export function externalReviewModerationLabel(status: ExternalReviewModerationStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Pending';
  }
}

export function externalReviewsAggregateLabel(reviews: PropertyExternalReview[]): {
  label: string;
  tone: 'empty' | 'pending' | 'live' | 'mixed';
} {
  if (reviews.length === 0) {
    return { label: 'None added', tone: 'empty' };
  }
  const approved = reviews.filter((r) => r.moderationStatus === 'approved').length;
  const pending = reviews.filter((r) => r.moderationStatus === 'pending').length;
  if (approved === reviews.length) {
    return { label: `${reviews.length} live on property page`, tone: 'live' };
  }
  if (pending > 0 && approved === 0) {
    return { label: `${reviews.length} submitted · pending approval`, tone: 'pending' };
  }
  return {
    label: `${approved} live · ${pending} pending`,
    tone: pending > 0 ? 'mixed' : 'live',
  };
}

export function validateExternalReviewsDraft(reviews: PropertyExternalReview[]): string | null {
  if (reviews.length > MAX_PROPERTY_EXTERNAL_REVIEWS) {
    return `You can add up to ${MAX_PROPERTY_EXTERNAL_REVIEWS} external reviews`;
  }
  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];
    const label = `Review ${i + 1}`;
    if (!review.reviewText.trim()) return `${label}: Enter review text`;
    if (!review.imageUrl?.trim() && !review.proofUrl?.trim()) {
      return `${label}: Add a screenshot or proof URL`;
    }
    if (review.proofUrl?.trim()) {
      try {
        const url = new URL(review.proofUrl.trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          return `${label}: Proof URL must start with http:// or https://`;
        }
      } catch {
        return `${label}: Enter a valid proof URL`;
      }
    }
  }
  return null;
}
