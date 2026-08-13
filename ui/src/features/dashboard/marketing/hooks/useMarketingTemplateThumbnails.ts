import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  CalendarStyles,
  PreviewBooking,
} from '@/features/dashboard/marketing/components/calendar-builder/types';
import { captureCalendarPresetThumbnail } from '@/features/dashboard/marketing/components/shared/MarketingCalendarThumbnailHost';
import type { MarketingTemplateRecord } from '@/features/dashboard/marketing/hooks/useMarketingTemplates';
import { calendarTemplateMatchesAspectPreset } from '@/features/dashboard/marketing/lib/calendarAutosave';
import type { CalendarCanvasFormat } from '@/features/dashboard/marketing/lib/calendarCanvasFormats';
import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import { calendarPreviewThumbKey } from '@/features/dashboard/marketing/lib/marketingBookedDates';
import {
  DEFAULT_MARKETING_THUMB_BINDING,
  resolveMarketingThumbBinding,
} from '@/features/dashboard/marketing/lib/marketingDefaultBinding';
import {
  waitForMarketingIdle,
  yieldToMainThread,
} from '@/features/dashboard/marketing/lib/marketingIdle';
import {
  getManyPersistedPresetThumbnails,
  setPersistedPresetThumbnail,
} from '@/features/dashboard/marketing/lib/marketingPresetThumbnailStore';
import {
  calendarPresetThumbnailKey,
  calendarSavedStylesThumbnailKey,
  designPresetThumbnailKey,
  getCachedMarketingThumbnail,
  marketingBindingCacheKey,
  savedDesignThumbnailKey,
  savedVideoThumbnailKey,
  setCachedMarketingThumbnail,
  subscribeMarketingThumbnailUpdates,
  videoPresetThumbnailKey,
} from '@/features/dashboard/marketing/lib/marketingTemplateThumbnailCache';
import { runWithConcurrency } from '@/features/dashboard/marketing/lib/marketingThumbnailQueue';
import { renderDesignPresetThumbnail } from '@/features/dashboard/marketing/lib/renderMarketingDesignThumbnail';
import {
  renderVideoPresetThumbnail,
  renderVideoProjectThumbnail,
} from '@/features/dashboard/marketing/lib/renderMarketingVideoThumbnail';
import { parseVideoProject } from '@/features/dashboard/marketing/lib/video/videoProjectDefaults';
import type {
  VideoFormat,
  VideoProject,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import { getVideoCampaignTemplate } from '@/features/dashboard/marketing/lib/videoCampaignTemplates';

import { resolveOrgBrandHex } from '@/lib/theme/brandColor';

type DesignOptions = {
  contentType: 'design';
  presetIds: string[];
  brandColor?: string;
  savedRecords?: MarketingTemplateRecord[];
};

type VideoOptions = {
  contentType: 'video';
  presetIds: string[];
  format: VideoFormat;
  brandColor?: string;
  binding?: DesignBinding;
  savedRecords?: MarketingTemplateRecord[];
};

type CalendarOptions = {
  contentType: 'calendar';
  presetIds: string[];
  canvasFormat: CalendarCanvasFormat;
  brandColor?: string;
  propertyPhotoUrl?: string;
  previewMonth: Date;
  previewBookings?: PreviewBooking[];
  savedCalendarTemplates?: Array<{
    id: string;
    sourcePresetId?: string | null;
    aspectPreset?: string | null;
    styles: CalendarStyles;
    updatedAt: string;
    thumbnailDataUrl?: string;
  }>;
};

export type CalendarThumbnailOptions = CalendarOptions;

type Options = DesignOptions | VideoOptions | CalendarOptions;

/** Remotion / Polotno / html-to-image captures are heavy — keep to one at a time. */
const PRESET_RENDER_CONCURRENCY = 1;

function savedRecordThumbnail(record: MarketingTemplateRecord): string | undefined {
  const value = record.designJson.thumbnailDataUrl;
  return typeof value === 'string' && value.startsWith('data:') ? value : undefined;
}

function presetPersistKey(contentType: Options['contentType'], cacheKey: string): string {
  return `${contentType}:${cacheKey}`;
}

function normalizeThumbnailRequestId(id: string): string {
  return id.replace(/^preset:/, '');
}

function shouldAliasSavedCalendarToPreset(
  sourcePresetId: string | null | undefined,
  aspectPreset: string | null | undefined,
  format: CalendarCanvasFormat
): boolean {
  if (!sourcePresetId || sourcePresetId === 'custom' || sourcePresetId === 'default') {
    return false;
  }
  return calendarTemplateMatchesAspectPreset(aspectPreset, format);
}

function isThumbnailRequested(id: string, requested: Set<string>): boolean {
  const bare = normalizeThumbnailRequestId(id);
  return requested.has(id) || requested.has(bare) || requested.has(`preset:${bare}`);
}

function mergePresetThumbnails(
  prev: Record<string, string>,
  presetIds: string[],
  next: Record<string, string>,
  includePresetAlias: boolean
): Record<string, string> {
  let changed = false;
  const merged = { ...prev };

  for (const [id, url] of Object.entries(next)) {
    if (merged[id] !== url) {
      merged[id] = url;
      changed = true;
    }
  }

  // Drop keys for the current preset set that were not re-hydrated.
  for (const id of presetIds) {
    if (!(id in next) && id in merged) {
      delete merged[id];
      changed = true;
    }
    if (includePresetAlias) {
      const alias = `preset:${id}`;
      if (!(alias in next) && alias in merged) {
        delete merged[alias];
        changed = true;
      }
    }
  }

  return changed ? merged : prev;
}

async function ensurePresetThumbnail(
  cacheKey: string,
  persistKey: string,
  render: () => Promise<string | null>
): Promise<string | null> {
  const cached = getCachedMarketingThumbnail(cacheKey);
  if (cached) return cached;

  const persisted = await getManyPersistedPresetThumbnails([persistKey]);
  const fromDb = persisted[persistKey];
  if (fromDb) {
    setCachedMarketingThumbnail(cacheKey, fromDb);
    return fromDb;
  }

  const dataUrl = await render();
  if (dataUrl) {
    setCachedMarketingThumbnail(cacheKey, dataUrl);
    void setPersistedPresetThumbnail(persistKey, dataUrl);
    return dataUrl;
  }
  return null;
}

export function useMarketingTemplateThumbnails(options: Options) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [hydrateVersion, setHydrateVersion] = useState(0);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [requestedIds, setRequestedIds] = useState<Set<string>>(() => new Set());
  const requestedIdsRef = useRef(requestedIds);
  requestedIdsRef.current = requestedIds;
  const thumbnailsRef = useRef(thumbnails);
  thumbnailsRef.current = thumbnails;
  const requestedKey = useMemo(() => [...requestedIds].sort().join('|'), [requestedIds]);

  const requestThumbnail = useCallback((id: string) => {
    const bare = normalizeThumbnailRequestId(id);
    setRequestedIds((prev) => {
      if (prev.has(id) || prev.has(bare) || prev.has(`preset:${bare}`)) return prev;
      const next = new Set(prev);
      next.add(id);
      next.add(bare);
      next.add(`preset:${bare}`);
      return next;
    });
  }, []);

  const requestThumbnails = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setRequestedIds((prev) => {
      let next: Set<string> | null = null;
      for (const id of ids) {
        const bare = normalizeThumbnailRequestId(id);
        if (prev.has(id) || prev.has(bare) || prev.has(`preset:${bare}`)) continue;
        if (!next) next = new Set(prev);
        next.add(id);
        next.add(bare);
        next.add(`preset:${bare}`);
      }
      return next ?? prev;
    });
  }, []);

  const contentType = options.contentType;
  const presetIds = options.presetIds;
  const videoFormat = options.contentType === 'video' ? options.format : undefined;
  const calendarFormat = options.contentType === 'calendar' ? options.canvasFormat : undefined;
  const brandColor = options.brandColor;
  const propertyPhotoUrl =
    options.contentType === 'calendar' ? options.propertyPhotoUrl : undefined;
  const videoBinding = options.contentType === 'video' ? options.binding : undefined;
  const previewBookings = options.contentType === 'calendar' ? (options.previewBookings ?? []) : [];
  const previewMonth = options.contentType === 'calendar' ? options.previewMonth : null;

  const videoBindingKey = useMemo(() => {
    if (contentType !== 'video') return '';
    return marketingBindingCacheKey(resolveMarketingThumbBinding(videoBinding));
  }, [contentType, videoBinding]);

  const calendarBrandKey = useMemo(() => {
    if (contentType !== 'calendar') return '';
    return resolveOrgBrandHex(brandColor).toLowerCase();
  }, [contentType, brandColor]);

  const calendarPreviewKey = useMemo(() => {
    if (contentType !== 'calendar' || !previewMonth) return '';
    return calendarPreviewThumbKey(previewMonth, previewBookings);
  }, [contentType, previewMonth, previewBookings]);

  const calendarPhotoKey = useMemo(() => {
    if (contentType !== 'calendar') return '';
    return propertyPhotoUrl ?? 'stock';
  }, [contentType, propertyPhotoUrl]);

  const presetKey = useMemo(() => {
    const ids = presetIds.join(',');
    if (contentType === 'calendar') {
      return `${calendarFormat}:${calendarBrandKey}:${calendarPhotoKey}:${calendarPreviewKey}:${ids}`;
    }
    if (contentType === 'video') return `${videoFormat}:${brandColor ?? ''}:${ids}`;
    if (contentType === 'design') return `${brandColor ?? ''}:${ids}`;
    return ids;
  }, [
    contentType,
    presetIds,
    calendarFormat,
    calendarBrandKey,
    calendarPhotoKey,
    calendarPreviewKey,
    videoFormat,
    brandColor,
  ]);

  const savedCalendarTemplates =
    contentType === 'calendar' ? (options.savedCalendarTemplates ?? []) : [];
  const savedRecords = contentType !== 'calendar' ? (options.savedRecords ?? []) : [];

  const savedKey = useMemo(() => {
    if (contentType === 'calendar') {
      return savedCalendarTemplates.map((item) => `${item.id}:${item.updatedAt}`).join(',');
    }
    return savedRecords.map((record) => `${record.id}:${record.updatedAt}`).join(',');
  }, [contentType, savedCalendarTemplates, savedRecords]);

  useEffect(() => {
    if (contentType !== 'calendar' || !calendarFormat) return;

    setThumbnails((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of presetIds) {
        for (const key of [id, `preset:${id}`]) {
          if (key in next) {
            delete next[key];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [contentType, calendarFormat, presetIds]);

  useEffect(() => {
    if (contentType !== 'design' && contentType !== 'video') return;
    return subscribeMarketingThumbnailUpdates((templateId, dataUrl) => {
      setThumbnails((prev) =>
        prev[templateId] === dataUrl ? prev : { ...prev, [templateId]: dataUrl }
      );
    });
  }, [contentType]);

  useEffect(() => {
    let cancelled = false;

    const hydratePresets = async () => {
      if (presetIds.length === 0) return;

      const cacheKeys = presetIds.map((id) => {
        if (contentType === 'design') return designPresetThumbnailKey(id, brandColor);
        if (contentType === 'video') {
          return videoPresetThumbnailKey(id, videoFormat!, brandColor, videoBindingKey);
        }
        return calendarPresetThumbnailKey(
          id,
          calendarFormat!,
          brandColor,
          calendarPreviewKey,
          propertyPhotoUrl
        );
      });

      const persistKeys = cacheKeys.map((key) => presetPersistKey(contentType, key));
      const next: Record<string, string> = {};

      for (let i = 0; i < presetIds.length; i += 1) {
        const id = presetIds[i]!;
        const cacheKey = cacheKeys[i]!;
        const memory = getCachedMarketingThumbnail(cacheKey);
        if (memory) {
          next[id] = memory;
          if (contentType === 'calendar') {
            next[`preset:${id}`] = memory;
          }
        }
      }

      const persisted = await getManyPersistedPresetThumbnails(persistKeys);
      if (cancelled) return;

      for (let i = 0; i < presetIds.length; i += 1) {
        const id = presetIds[i]!;
        const cacheKey = cacheKeys[i]!;
        const persistKey = persistKeys[i]!;
        const fromDb = persisted[persistKey];
        if (fromDb) {
          setCachedMarketingThumbnail(cacheKey, fromDb);
          next[id] = fromDb;
          if (contentType === 'calendar') {
            next[`preset:${id}`] = fromDb;
          }
        }
      }

      if (cancelled) return;

      const merged = mergePresetThumbnails(
        thumbnailsRef.current,
        presetIds,
        next,
        contentType === 'calendar'
      );
      if (merged === thumbnailsRef.current) return;

      thumbnailsRef.current = merged;
      setThumbnails(merged);
      setHydrateVersion((version) => version + 1);
    };

    void hydratePresets();

    return () => {
      cancelled = true;
    };
  }, [
    contentType,
    presetKey,
    videoFormat,
    calendarFormat,
    brandColor,
    calendarPreviewKey,
    videoBindingKey,
    presetIds,
  ]);

  useEffect(() => {
    let cancelled = false;

    const renderMissingPresets = async () => {
      if (presetIds.length === 0) return;

      const current = thumbnailsRef.current;
      const missingIds = presetIds.filter((id) => !current[id]);
      const renderIds = missingIds.filter((id) =>
        isThumbnailRequested(id, requestedIdsRef.current)
      );

      if (renderIds.length === 0) return;

      await waitForMarketingIdle();
      if (cancelled || document.hidden) return;

      await runWithConcurrency(renderIds, PRESET_RENDER_CONCURRENCY, async (id) => {
        if (cancelled || document.hidden) return;
        await yieldToMainThread();
        if (cancelled) return;

        setLoadingIds((prev) => new Set(prev).add(id));

        let cacheKey: string;
        let dataUrl: string | null = null;

        try {
          if (contentType === 'design') {
            cacheKey = designPresetThumbnailKey(id, brandColor);
            dataUrl = await ensurePresetThumbnail(
              cacheKey,
              presetPersistKey('design', cacheKey),
              () => renderDesignPresetThumbnail(id, DEFAULT_MARKETING_THUMB_BINDING, brandColor)
            );
            if (!dataUrl && !cancelled) {
              await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
              dataUrl = await renderDesignPresetThumbnail(
                id,
                DEFAULT_MARKETING_THUMB_BINDING,
                brandColor
              );
              if (dataUrl) {
                setCachedMarketingThumbnail(cacheKey, dataUrl);
                void setPersistedPresetThumbnail(presetPersistKey('design', cacheKey), dataUrl);
              }
            }
          } else if (contentType === 'video') {
            const thumbBinding = resolveMarketingThumbBinding(videoBinding);
            cacheKey = videoPresetThumbnailKey(id, videoFormat!, brandColor, videoBindingKey);
            dataUrl = await ensurePresetThumbnail(
              cacheKey,
              presetPersistKey('video', cacheKey),
              () => renderVideoPresetThumbnail(id, videoFormat!, thumbBinding, brandColor)
            );
            if (!dataUrl && !cancelled) {
              await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
              dataUrl = await renderVideoPresetThumbnail(
                id,
                videoFormat!,
                thumbBinding,
                brandColor
              );
              if (dataUrl) {
                setCachedMarketingThumbnail(cacheKey, dataUrl);
                void setPersistedPresetThumbnail(presetPersistKey('video', cacheKey), dataUrl);
              }
            }
          } else {
            cacheKey = calendarPresetThumbnailKey(
              id,
              calendarFormat!,
              brandColor,
              calendarPreviewKey,
              propertyPhotoUrl
            );
            dataUrl = await ensurePresetThumbnail(
              cacheKey,
              presetPersistKey('calendar', cacheKey),
              () =>
                captureCalendarPresetThumbnail(
                  id,
                  DEFAULT_MARKETING_THUMB_BINDING.propertyName,
                  calendarFormat!,
                  brandColor,
                  propertyPhotoUrl
                )
            );
          }

          if (cancelled) return;

          if (dataUrl) {
            setThumbnails((prev) => {
              if (prev[id] === dataUrl) return prev;
              const patch: Record<string, string> = { [id]: dataUrl! };
              if (contentType === 'calendar') {
                patch[`preset:${id}`] = dataUrl!;
              }
              return { ...prev, ...patch };
            });
          }
        } finally {
          setLoadingIds((prev) => {
            const copy = new Set(prev);
            copy.delete(id);
            return copy;
          });
        }
      });
    };

    void renderMissingPresets();

    return () => {
      cancelled = true;
    };
  }, [
    contentType,
    presetKey,
    requestedKey,
    hydrateVersion,
    videoFormat,
    calendarFormat,
    brandColor,
    calendarPreviewKey,
    videoBindingKey,
    videoBinding,
    presetIds,
  ]);

  useEffect(() => {
    if (contentType !== 'calendar') return;
    if (!calendarFormat) return;
    if (savedCalendarTemplates.length === 0) return;

    let cancelled = false;

    const applySavedThumbnail = (
      prev: Record<string, string>,
      saved: (typeof savedCalendarTemplates)[number],
      dataUrl: string
    ): Record<string, string> => {
      const thumbId = `saved:${saved.id}`;
      const next = prev[thumbId] === dataUrl ? prev : { ...prev, [thumbId]: dataUrl };

      if (saved.sourcePresetId === 'custom') {
        const customThumbId = `custom:${saved.id}`;
        return next[customThumbId] === dataUrl ? next : { ...next, [customThumbId]: dataUrl };
      }

      if (
        shouldAliasSavedCalendarToPreset(saved.sourcePresetId, saved.aspectPreset, calendarFormat)
      ) {
        const presetThumbId = `preset:${saved.sourcePresetId}`;
        return next[presetThumbId] === dataUrl ? next : { ...next, [presetThumbId]: dataUrl };
      }

      return next;
    };

    const loadSaved = async () => {
      const { captureCalendarStylesThumbnail } =
        await import('@/features/dashboard/marketing/components/shared/MarketingCalendarThumbnailHost');

      await runWithConcurrency(savedCalendarTemplates, PRESET_RENDER_CONCURRENCY, async (saved) => {
        if (cancelled) return;
        if (!calendarTemplateMatchesAspectPreset(saved.aspectPreset, calendarFormat)) return;

        const thumbId = `saved:${saved.id}`;
        const cacheKey = calendarSavedStylesThumbnailKey(
          saved.id,
          saved.updatedAt,
          calendarPreviewKey,
          calendarFormat
        );

        if (saved.thumbnailDataUrl) {
          setCachedMarketingThumbnail(cacheKey, saved.thumbnailDataUrl);
          setThumbnails((prev) => applySavedThumbnail(prev, saved, saved.thumbnailDataUrl!));
          return;
        }

        const cached = getCachedMarketingThumbnail(cacheKey);
        if (cached) {
          setThumbnails((prev) => applySavedThumbnail(prev, saved, cached));
          return;
        }

        setLoadingIds((prev) => new Set(prev).add(thumbId));
        const dataUrl = await captureCalendarStylesThumbnail(
          saved.styles,
          DEFAULT_MARKETING_THUMB_BINDING.propertyName
        );
        if (cancelled) return;
        if (dataUrl) {
          setCachedMarketingThumbnail(cacheKey, dataUrl);
          setThumbnails((prev) => applySavedThumbnail(prev, saved, dataUrl));
        }
        setLoadingIds((prev) => {
          const copy = new Set(prev);
          copy.delete(thumbId);
          return copy;
        });
      });
    };

    void loadSaved();

    return () => {
      cancelled = true;
    };
  }, [contentType, savedKey, calendarPreviewKey, calendarFormat, savedCalendarTemplates]);

  useEffect(() => {
    if (contentType === 'calendar') return;
    if (savedRecords.length === 0) return;

    let cancelled = false;

    const loadSaved = async () => {
      await runWithConcurrency(savedRecords, PRESET_RENDER_CONCURRENCY, async (record) => {
        if (cancelled) return;

        const cacheKey =
          contentType === 'design'
            ? savedDesignThumbnailKey(record.id, record.updatedAt)
            : savedVideoThumbnailKey(record.id, record.updatedAt);

        const embedded = savedRecordThumbnail(record);
        if (embedded) {
          setCachedMarketingThumbnail(cacheKey, embedded);
          setThumbnails((prev) =>
            prev[record.id] === embedded ? prev : { ...prev, [record.id]: embedded }
          );
          return;
        }

        const cached = getCachedMarketingThumbnail(cacheKey);
        if (cached) {
          setThumbnails((prev) =>
            prev[record.id] === cached ? prev : { ...prev, [record.id]: cached }
          );
          return;
        }

        // OpenPolotno `toBlob` finds Konva stages by pageId. Compiled docs reuse
        // `page-1`, so a headless store captures the live editor canvas instead
        // of this record. Saved design thumbs must come from thumbnailDataUrl
        // (captured against the mounted Workspace at save/select time).
        if (contentType === 'design') return;

        if (contentType === 'video') {
          if (!isThumbnailRequested(record.id, requestedIdsRef.current)) return;
          await waitForMarketingIdle();
          if (cancelled || document.hidden) return;
        }

        setLoadingIds((prev) => new Set(prev).add(record.id));

        let dataUrl: string | null = null;
        if (contentType === 'video') {
          const template = getVideoCampaignTemplate(
            typeof record.designJson.templateId === 'string'
              ? record.designJson.templateId
              : record.id
          );
          const thumbBinding = resolveMarketingThumbBinding(videoBinding);
          const project = parseVideoProject(
            record.designJson.project ?? record.designJson,
            typeof record.designJson.templateId === 'string'
              ? record.designJson.templateId
              : 'quiet-morning',
            template?.category ?? 'soft-stay',
            thumbBinding,
            (typeof record.aspectPreset === 'string'
              ? record.aspectPreset
              : videoFormat!) as VideoFormat
          );
          dataUrl = await renderVideoProjectThumbnail(project, brandColor);
        }

        if (cancelled) return;

        if (dataUrl) {
          setCachedMarketingThumbnail(cacheKey, dataUrl);
          setThumbnails((prev) =>
            prev[record.id] === dataUrl ? prev : { ...prev, [record.id]: dataUrl! }
          );
        }

        setLoadingIds((prev) => {
          const copy = new Set(prev);
          copy.delete(record.id);
          return copy;
        });
      });
    };

    void loadSaved();

    return () => {
      cancelled = true;
    };
  }, [contentType, savedKey, videoFormat, brandColor, videoBindingKey, videoBinding, requestedKey]);

  const getThumbnailUrl = (id: string) => {
    const bareId = id.replace(/^preset:/, '');
    return (
      thumbnails[id] ??
      thumbnails[bareId] ??
      (id.startsWith('preset:') ? undefined : thumbnails[`preset:${id}`])
    );
  };

  const isThumbnailLoading = (id: string) => {
    const bareId = id.replace(/^preset:/, '');
    return loadingIds.has(id) || loadingIds.has(bareId);
  };

  return { getThumbnailUrl, isThumbnailLoading, thumbnails, requestThumbnail, requestThumbnails };
}

export async function captureLiveVideoProjectThumbnail(
  project: VideoProject,
  brandColor?: string
): Promise<string | null> {
  return renderVideoProjectThumbnail(project, brandColor);
}

export async function captureLiveCalendarStylesThumbnail(
  styles: CalendarStyles,
  propertyName: string
): Promise<string | null> {
  const { captureCalendarStylesThumbnail } =
    await import('@/features/dashboard/marketing/components/shared/MarketingCalendarThumbnailHost');
  return captureCalendarStylesThumbnail(styles, propertyName);
}
