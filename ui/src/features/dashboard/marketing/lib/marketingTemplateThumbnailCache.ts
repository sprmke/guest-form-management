import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';

import { resolveOrgBrandHex } from '@/lib/theme/brandColor';

const MAX_CACHE_ENTRIES = 80;

const cache = new Map<string, string>();
const blobUrls = new Set<string>();

function evictOldestIfNeeded(): void {
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const value = cache.get(oldestKey);
    if (value?.startsWith('blob:')) {
      URL.revokeObjectURL(value);
      blobUrls.delete(value);
    }
    cache.delete(oldestKey);
  }
}

export function getCachedMarketingThumbnail(key: string): string | undefined {
  const value = cache.get(key);
  if (value === undefined) return undefined;
  // Refresh LRU order on read.
  cache.delete(key);
  cache.set(key, value);
  return value;
}

export function setCachedMarketingThumbnail(key: string, value: string): void {
  const previous = cache.get(key);
  if (previous?.startsWith('blob:') && previous !== value) {
    URL.revokeObjectURL(previous);
    blobUrls.delete(previous);
  }
  if (value.startsWith('blob:')) {
    blobUrls.add(value);
  }
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);
  evictOldestIfNeeded();
}

type ThumbnailUpdateListener = (templateId: string, dataUrl: string) => void;
const updateListeners = new Set<ThumbnailUpdateListener>();

/** Lets the design editor push a freshly captured preset thumb into sidebar cards. */
export function subscribeMarketingThumbnailUpdates(listener: ThumbnailUpdateListener) {
  updateListeners.add(listener);
  return () => {
    updateListeners.delete(listener);
  };
}

export function publishMarketingPresetThumbnail(
  templateId: string,
  cacheKey: string,
  dataUrl: string
) {
  setCachedMarketingThumbnail(cacheKey, dataUrl);
  for (const listener of updateListeners) {
    listener(templateId, dataUrl);
  }
}

export function marketingBindingCacheKey(binding: DesignBinding): string {
  const mediaKey =
    binding.propertyMedia?.map((item) => `${item.type}:${item.url}`).join(',') ??
    binding.propertyPhoto ??
    '';
  return [
    binding.propertyName,
    mediaKey,
    binding.monthLabel,
    binding.nightlyRate,
    binding.availabilityText,
  ].join('|');
}

export function designThumbnailKey(templateId: string, binding: DesignBinding): string {
  return `design:${templateId}:${marketingBindingCacheKey(binding)}`;
}

/** Preset thumbnails use a stable default binding so they load instantly and persist across visits. */
export function designPresetThumbnailKey(templateId: string): string {
  return `design:preset:v3:${templateId}`;
}

export function videoThumbnailKey(
  templateId: string,
  format: string,
  binding: DesignBinding
): string {
  return `video:${templateId}:${format}:${marketingBindingCacheKey(binding)}`;
}

export function videoPresetThumbnailKey(
  templateId: string,
  format: string,
  brandColor?: string
): string {
  const brand = resolveOrgBrandHex(brandColor).toLowerCase();
  return `video:preset:v4:${templateId}:${format}:${brand}`;
}

export function calendarThumbnailKey(presetId: string, propertyName: string): string {
  return `calendar:preset:${presetId}:${propertyName}`;
}

export function calendarPresetThumbnailKey(
  presetId: string,
  format: string = 'square',
  brandColor?: string,
  previewDataKey?: string,
  propertyPhotoUrl?: string
): string {
  const brand = resolveOrgBrandHex(brandColor).toLowerCase();
  const preview = previewDataKey ?? 'default';
  const photo = propertyPhotoUrl ?? 'stock';
  return `calendar:preset:v8:${format}:${brand}:${preview}:${photo}:${presetId}`;
}

export function calendarSavedStylesThumbnailKey(
  savedId: string,
  updatedAt: string,
  previewDataKey: string
): string {
  return `calendar:saved:${savedId}:${updatedAt}:${previewDataKey}`;
}

export function savedDesignThumbnailKey(recordId: string, updatedAt: string): string {
  return `design:saved:${recordId}:${updatedAt}`;
}

export function savedVideoThumbnailKey(recordId: string, updatedAt: string): string {
  return `video:saved:${recordId}:${updatedAt}`;
}
