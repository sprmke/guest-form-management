/**
 * External review proof stored on app_settings.external_reviews (JSONB).
 * Keep in sync with `ui/src/features/dashboard/org/lib/propertyExternalReviews.ts`.
 */

import {
  GUEST_REVIEW_CONSTRUCTIVE_TAG_IDS,
  GUEST_REVIEW_POSITIVE_TAG_IDS,
  MAX_GUEST_REVIEW_FEEDBACK_TAGS,
  validateGuestReviewFeedbackTags,
} from './guestReviewFeedbackTags.ts';
import type { PublicGuestReviewDto } from './guestReviewService.ts';

export const MAX_PROPERTY_EXTERNAL_REVIEWS = 5;
export const MAX_EXTERNAL_REVIEW_STAY_PHOTOS = 3;
export const MAX_EXTERNAL_REVIEW_TEXT_LENGTH = 2000;

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
  stayPhotoUrls: string[];
  feedbackTags: string[];
  moderationStatus: ExternalReviewModerationStatus;
  createdAt: string | null;
};

const EXTERNAL_REVIEW_SOURCES = new Set<ExternalReviewSource>(['facebook', 'airbnb']);
const POSITIVE_SET = new Set<string>(GUEST_REVIEW_POSITIVE_TAG_IDS);
const CONSTRUCTIVE_SET = new Set<string>(GUEST_REVIEW_CONSTRUCTIVE_TAG_IDS);
const ALL_FEEDBACK_TAG_IDS = new Set<string>([
  ...GUEST_REVIEW_POSITIVE_TAG_IDS,
  ...GUEST_REVIEW_CONSTRUCTIVE_TAG_IDS,
]);

function newReviewId(): string {
  return crypto.randomUUID();
}

export function normalizeExternalReviewFeedbackTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const id = entry.trim();
    if (!id || !ALL_FEEDBACK_TAG_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    tags.push(id);
    if (tags.length >= MAX_GUEST_REVIEW_FEEDBACK_TAGS) break;
  }
  return tags;
}

export function filterExternalReviewFeedbackTagsForRating(
  starRating: number | null,
  tagIds: string[]
): string[] {
  const rating = starRating ?? 5;
  const allowed = rating >= 4 ? POSITIVE_SET : CONSTRUCTIVE_SET;
  return tagIds.filter((id) => allowed.has(id)).slice(0, MAX_GUEST_REVIEW_FEEDBACK_TAGS);
}

function feedbackTagsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
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
    stayPhotoUrls: [],
    feedbackTags: [],
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

export function normalizeStayPhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim())
    .slice(0, MAX_EXTERNAL_REVIEW_STAY_PHOTOS);
}

export function stayPhotoUrlsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((url, index) => url === b[index]);
}

export function externalReviewContentEqual(
  a: PropertyExternalReview,
  b: PropertyExternalReview
): boolean {
  return (
    a.source === b.source &&
    a.reviewText.trim() === b.reviewText.trim() &&
    a.reviewerName.trim() === b.reviewerName.trim() &&
    a.starRating === b.starRating &&
    (a.imageUrl ?? '') === (b.imageUrl ?? '') &&
    (a.proofUrl ?? '') === (b.proofUrl ?? '') &&
    stayPhotoUrlsEqual(a.stayPhotoUrls, b.stayPhotoUrls) &&
    feedbackTagsEqual(a.feedbackTags, b.feedbackTags)
  );
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
      stayPhotoUrls: normalizeStayPhotoUrls(row.stayPhotoUrls),
      feedbackTags: normalizeExternalReviewFeedbackTags(row.feedbackTags),
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
    if (review.reviewText.trim().length > MAX_EXTERNAL_REVIEW_TEXT_LENGTH) {
      return `${label}: Review text is too long`;
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
    if (!review.imageUrl?.trim() && !review.proofUrl?.trim()) {
      return `${label}: Add a screenshot or proof URL`;
    }
    const stayCount = review.stayPhotoUrls.length;
    if (stayCount > MAX_EXTERNAL_REVIEW_STAY_PHOTOS) {
      return `${label}: You can add up to ${MAX_EXTERNAL_REVIEW_STAY_PHOTOS} stay photos`;
    }
    const ratingForTags = review.starRating ?? 5;
    const tagsError = validateGuestReviewFeedbackTags(ratingForTags, review.feedbackTags);
    if (tagsError) return `${label}: ${tagsError}`;
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
    const contentChanged = !prior || !externalReviewContentEqual(prior, review);
    const resubmitted =
      contentChanged &&
      prior != null &&
      (prior.moderationStatus === 'approved' || prior.moderationStatus === 'rejected');

    return {
      id: review.id.trim() || newReviewId(),
      source: normalizeSource(review.source),
      reviewText: review.reviewText.trim(),
      reviewerName: review.reviewerName.trim(),
      starRating: normalizeStarRating(review.starRating),
      imageUrl: review.imageUrl?.trim() || null,
      proofUrl: review.proofUrl?.trim() || null,
      stayPhotoUrls: normalizeStayPhotoUrls(review.stayPhotoUrls),
      feedbackTags: filterExternalReviewFeedbackTagsForRating(
        normalizeStarRating(review.starRating),
        normalizeExternalReviewFeedbackTags(review.feedbackTags)
      ),
      moderationStatus: contentChanged ? 'pending' : (prior?.moderationStatus ?? 'pending'),
      createdAt: resubmitted
        ? new Date().toISOString()
        : (prior?.createdAt ?? new Date().toISOString()),
    };
  });
}

export type ExternalReviewAssetUploadType = 'external_review_image' | 'external_review_stay_photo';

/** After proof/stay photo upload: mark review pending and persist new asset URL when review exists in JSONB. */
export function applyExternalReviewAssetUpload(
  reviews: PropertyExternalReview[],
  reviewId: string,
  assetType: ExternalReviewAssetUploadType,
  url: string,
  photoIndex?: number
): PropertyExternalReview[] | null {
  const id = reviewId.trim();
  const safeUrl = url.trim();
  if (!id || !safeUrl) return null;

  let found = false;
  const next = reviews.map((review) => {
    if (review.id !== id) return review;

    found = true;
    const wasModerated =
      review.moderationStatus === 'approved' || review.moderationStatus === 'rejected';

    if (assetType === 'external_review_image') {
      const contentChanged = (review.imageUrl ?? '') !== safeUrl;
      if (!contentChanged && !wasModerated) return review;
      return {
        ...review,
        imageUrl: safeUrl,
        moderationStatus: 'pending' as const,
        createdAt: wasModerated || contentChanged ? new Date().toISOString() : review.createdAt,
      };
    }

    const photos = normalizeStayPhotoUrls(review.stayPhotoUrls);
    const idx = Math.min(
      Math.max(photoIndex ?? photos.length, 0),
      MAX_EXTERNAL_REVIEW_STAY_PHOTOS - 1
    );
    const nextPhotos = [...photos];
    if (idx === nextPhotos.length && nextPhotos.length < MAX_EXTERNAL_REVIEW_STAY_PHOTOS) {
      nextPhotos.push(safeUrl);
    } else {
      nextPhotos[idx] = safeUrl;
    }
    const normalizedPhotos = normalizeStayPhotoUrls(nextPhotos);
    const contentChanged = !stayPhotoUrlsEqual(photos, normalizedPhotos);

    if (!contentChanged && !wasModerated) return review;

    return {
      ...review,
      stayPhotoUrls: normalizedPhotos,
      moderationStatus: 'pending' as const,
      createdAt: wasModerated || contentChanged ? new Date().toISOString() : review.createdAt,
    };
  });

  return found ? next : null;
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
      (review.proofUrl ?? '') === (other.proofUrl ?? '') &&
      stayPhotoUrlsEqual(review.stayPhotoUrls, other.stayPhotoUrls) &&
      feedbackTagsEqual(review.feedbackTags, other.feedbackTags)
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
      feedbackTags: review.feedbackTags,
      media: normalizeStayPhotoUrls(review.stayPhotoUrls).map((url) => ({
        url,
        type: 'image' as const,
      })),
      source: review.source,
      createdAt: review.createdAt,
    }));
}

export function normalizeSuperhostStatus(raw: unknown): SuperhostStatus {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'pending' || value === 'approved' || value === 'rejected') return value;
  return 'none';
}

export type ExternalReviewModerationDecision = 'approved' | 'rejected';

/** Super-admin: set moderation status on one review; throws if missing or not pending. */
export function updateExternalReviewModerationStatus(
  reviews: PropertyExternalReview[],
  reviewId: string,
  decision: ExternalReviewModerationDecision
): PropertyExternalReview[] {
  const id = reviewId.trim();
  if (!id) throw new Error('reviewId is required');

  let found = false;
  const next = reviews.map((review) => {
    if (review.id !== id) return review;
    found = true;
    if (review.moderationStatus !== 'pending') {
      throw new Error('Review is not pending moderation');
    }
    return { ...review, moderationStatus: decision };
  });

  if (!found) throw new Error('Review not found');
  return next;
}

/** Extract storage object path from a public app-settings-assets URL, if present. */
export function externalReviewImageStoragePath(
  imageUrl: string | null,
  propertyId: string,
  reviewId: string
): string | null {
  if (!imageUrl?.trim()) return null;
  const trimmed = imageUrl.trim();
  const marker = '/app-settings-assets/';
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) {
    const path = trimmed.slice(idx + marker.length).split('?')[0];
    return path || null;
  }
  return `external-review/${propertyId}/${reviewId}.jpg`;
}

/** Storage path for stay photo at index 0–2. */
export function externalReviewStayPhotoStoragePath(
  photoUrl: string | null,
  propertyId: string,
  reviewId: string,
  photoIndex: number
): string | null {
  if (!photoUrl?.trim()) return null;
  const trimmed = photoUrl.trim();
  const marker = '/app-settings-assets/';
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) {
    const path = trimmed.slice(idx + marker.length).split('?')[0];
    return path || null;
  }
  const safeIndex = Math.min(Math.max(photoIndex, 0), MAX_EXTERNAL_REVIEW_STAY_PHOTOS - 1);
  return `external-review-stay/${propertyId}/${reviewId}/${safeIndex}.jpg`;
}
