/**
 * Batch facet/aggregate helpers for public list-public-* endpoints.
 * Never call ensurePropertySettings / loadPropertyPricing in a loop — those upsert.
 */

import { createServiceClient } from './orgAuth.ts';
import { AMENITY_LABELS } from './publicPropertyAmenities.ts';
import { listApprovedPublicExternalReviews } from './propertyExternalReviews.ts';

/** Same default as propertyPricing.ts DEFAULT_WEEKDAY — keep in sync. */
export const DEFAULT_LISTING_WEEKDAY_RATE = 2799;

export type ReviewStats = {
  rating: number | null;
  reviewCount: number;
};

export type AmenityFacet = { id: string; label: string; count: number };
export type PriceFacet = { min: number; max: number };
export type CountFacet<T extends string | number> = { value: T; count: number };

function chunkIds<T>(ids: T[], size = 200): T[][] {
  if (ids.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/** Single batched read of weekday rates — no ensurePropertySettings side effect. */
export async function batchLoadPropertyPricing(
  propertyIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (propertyIds.length === 0) return result;

  const supabase = createServiceClient();
  for (const chunk of chunkIds(propertyIds)) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('property_id, weekday_nightly_rate')
      .in('property_id', chunk);
    if (error) {
      console.warn('[publicListingFacets] pricing batch failed:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      const id = row.property_id as string | null;
      if (!id) continue;
      const rate =
        row.weekday_nightly_rate != null && Number.isFinite(Number(row.weekday_nightly_rate))
          ? Number(row.weekday_nightly_rate)
          : DEFAULT_LISTING_WEEKDAY_RATE;
      result.set(id, rate);
    }
  }

  for (const id of propertyIds) {
    if (!result.has(id)) result.set(id, DEFAULT_LISTING_WEEKDAY_RATE);
  }
  return result;
}

/**
 * Batch guest_reviews + approved external_reviews into avg rating + count
 * (same merge rule as publicPropertyService per-slug, without N+1).
 */
export async function batchLoadReviewStats(
  propertyIds: string[]
): Promise<Map<string, ReviewStats>> {
  const result = new Map<string, ReviewStats>();
  for (const id of propertyIds) {
    result.set(id, { rating: null, reviewCount: 0 });
  }
  if (propertyIds.length === 0) return result;

  const supabase = createServiceClient();
  const sums = new Map<string, { sum: number; count: number }>();

  for (const chunk of chunkIds(propertyIds)) {
    const { data, error } = await supabase
      .from('guest_reviews')
      .select('property_id, star_rating')
      .in('property_id', chunk);
    if (error) {
      console.warn('[publicListingFacets] guest_reviews batch failed:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      const id = row.property_id as string | null;
      if (!id) continue;
      const rating = Number(row.star_rating) || 0;
      const entry = sums.get(id) ?? { sum: 0, count: 0 };
      entry.sum += rating;
      entry.count += 1;
      sums.set(id, entry);
    }
  }

  for (const chunk of chunkIds(propertyIds)) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('property_id, external_reviews')
      .in('property_id', chunk);
    if (error) {
      console.warn('[publicListingFacets] external_reviews batch failed:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      const id = row.property_id as string | null;
      if (!id) continue;
      const approved = listApprovedPublicExternalReviews(row.external_reviews);
      if (approved.length === 0) continue;
      const entry = sums.get(id) ?? { sum: 0, count: 0 };
      for (const review of approved) {
        entry.sum += review.rating;
        entry.count += 1;
      }
      sums.set(id, entry);
    }
  }

  for (const [id, entry] of sums) {
    result.set(id, {
      rating: entry.count > 0 ? Math.round((entry.sum / entry.count) * 10) / 10 : null,
      reviewCount: entry.count,
    });
  }
  return result;
}

export function amenityLabelForId(id: string): string {
  return AMENITY_LABELS[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Tally amenity ids across the filtered working set. */
export function computeAmenityFacet(amenityIdLists: string[][]): AmenityFacet[] {
  const counts = new Map<string, number>();
  for (const list of amenityIdLists) {
    const seen = new Set<string>();
    for (const id of list) {
      const trimmed = id.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: amenityLabelForId(id), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function computePriceFacet(prices: number[]): PriceFacet {
  if (prices.length === 0) return { min: 0, max: 0 };
  let min = prices[0]!;
  let max = prices[0]!;
  for (const price of prices) {
    if (price < min) min = price;
    if (price > max) max = price;
  }
  return { min, max };
}

export function computeStringCountFacet(
  values: Array<string | null | undefined>
): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = (raw ?? '').trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function computeNumberCountFacet(
  values: Array<number | null | undefined>
): CountFacet<number>[] {
  const counts = new Map<number, number>();
  for (const raw of values) {
    if (raw == null || !Number.isFinite(raw)) continue;
    const value = Math.floor(raw);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value);
}

export function propertyTypeLabel(type: string): string {
  const normalized = type.trim().toLowerCase();
  const labels: Record<string, string> = {
    apartment: 'Apartment',
    condo: 'Condo',
    house: 'House',
    villa: 'Villa',
    townhouse: 'Townhouse',
    cabin: 'Cabin',
    resort: 'Resort',
    hotel: 'Hotel',
    other: 'Property',
  };
  return (
    labels[normalized] ??
    (normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Property')
  );
}
