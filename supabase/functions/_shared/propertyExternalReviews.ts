/**
 * External review proof stored on app_settings.external_reviews (JSONB).
 * Keep in sync with `ui/src/features/dashboard/org/lib/propertyExternalReviews.ts`.
 */

import type { PublicGuestReviewDto } from './guestReviewService.ts';

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

const EXTERNAL_REVIEW_SOURCES = new Set<ExternalReviewSource>(['facebook', 'airbnb']);

function newReviewId(): string {
  return crypto.randomUUID();
}

export function createEmptyExternalReview(
  source: ExternalReviewSource = 'airbnb'
): PropertyExternalReview {
  return {
    id: newReviewId(),
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

function normalizeSource(raw: unknown): ExternalReviewSource {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return EXTERNAL_REVIEW_SOURCES.has(value as ExternalReviewSource)
    ? (value as ExternalReviewSource)
    : 'airbnb';
}

function normalizeModerationStatus(raw: unknown): ExternalReviewModerationStatus {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'approved' || value === 'rejected') return value;
  return 'pending';
}

function normalizeStarRating(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export function normalizeExternalReviewsDraft(raw: unknown): PropertyExternalReview[] {
  if (!Array.isArray(raw)) return [];
  const parsed: PropertyExternalReview[] = [];
  for (const item of raw.slice(0, MAX_PROPERTY_EXTERNAL_REVIEWS)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    parsed.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : newReviewId(),
      source: normalizeSource(row.source),
      reviewText: typeof row.reviewText === 'string' ? row.reviewText.trim() : '',
      reviewerName: typeof row.reviewerName === 'string' ? row.reviewerName.trim() : '',
      starRating: normalizeStarRating(row.starRating),
      imageUrl:
        typeof row.imageUrl === 'string' && row.imageUrl.trim() ? row.imageUrl.trim() : null,
      proofUrl:
        typeof row.proofUrl === 'string' && row.proofUrl.trim() ? row.proofUrl.trim() : null,
      moderationStatus: normalizeModerationStatus(row.moderationStatus),
      createdAt:
        typeof row.createdAt === 'string' && row.createdAt.trim() ? row.createdAt.trim() : null,
    });
  }
  return parsed;
}

export function validateExternalReviews(reviews: PropertyExternalReview[]): string | null {
  if (reviews.length > MAX_PROPERTY_EXTERNAL_REVIEWS) {
    return `You can add up to ${MAX_PROPERTY_EXTERNAL_REVIEWS} external reviews`;
  }
  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];
    const label = `Review ${i + 1}`;
    if (!review.reviewText.trim()) return `${label}: Enter review text`;
    if (review.reviewText.trim().length > 2000) return `${label}: Review text is too long`;
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
    if (!review.imageUrl?.trim() && !review.proofUrl?.trim()) {
      return `${label}: Add a screenshot or proof URL`;
    }
  }
  return null;
}

/** Owner PATCH: force pending on all submitted reviews; preserve createdAt when id matches. */
export function serializeExternalReviewsForOwnerPatch(
  incoming: PropertyExternalReview[],
  existing: PropertyExternalReview[]
): PropertyExternalReview[] {
  const err = validateExternalReviews(incoming);
  if (err) throw new Error(err);

  const existingById = new Map(existing.map((review) => [review.id, review]));

  return incoming.map((review) => {
    const prior = existingById.get(review.id);
    const contentChanged =
      !prior ||
      prior.source !== review.source ||
      prior.reviewText.trim() !== review.reviewText.trim() ||
      prior.reviewerName.trim() !== review.reviewerName.trim() ||
      prior.starRating !== review.starRating ||
      (prior.imageUrl ?? '') !== (review.imageUrl ?? '') ||
      (prior.proofUrl ?? '') !== (review.proofUrl ?? '');

    return {
      id: review.id.trim() || newReviewId(),
      source: normalizeSource(review.source),
      reviewText: review.reviewText.trim(),
      reviewerName: review.reviewerName.trim(),
      starRating: normalizeStarRating(review.starRating),
      imageUrl: review.imageUrl?.trim() || null,
      proofUrl: review.proofUrl?.trim() || null,
      moderationStatus: contentChanged ? 'pending' : (prior?.moderationStatus ?? 'pending'),
      createdAt: prior?.createdAt ?? new Date().toISOString(),
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

function formatReviewMonthYear(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  });
}

export function listApprovedPublicExternalReviews(raw: unknown): PublicGuestReviewDto[] {
  return normalizeExternalReviewsDraft(raw)
    .filter((review) => review.moderationStatus === 'approved')
    .map((review) => ({
      id: `ext-${review.id}`,
      author:
        review.reviewerName.trim() ||
        (review.source === 'airbnb' ? 'Airbnb guest' : 'Facebook guest'),
      date: formatReviewMonthYear(review.createdAt) || 'Verified review',
      rating: review.starRating ?? 5,
      comment: review.reviewText,
      feedbackTags: [],
      media: review.imageUrl ? [{ url: review.imageUrl, type: 'image' as const }] : [],
      source: review.source,
    }));
}

export function normalizeSuperhostStatus(raw: unknown): SuperhostStatus {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'pending' || value === 'approved' || value === 'rejected') return value;
  return 'none';
}
