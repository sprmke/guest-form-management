import type { MarketingTemplateRecord } from '@/features/dashboard/marketing/hooks/useMarketingTemplates';
import { isDesignCustomTemplate } from '@/features/dashboard/marketing/lib/designAutosave';
import { isVideoCategory } from '@/features/dashboard/marketing/lib/video/videoCategories';

export { isDesignCustomTemplate } from '@/features/dashboard/marketing/lib/designAutosave';

/** Design category ids that may still sit on pre–Quiet Coast video autosaves. */
const VIDEO_LEGACY_CATEGORY_MAP: Record<string, string> = {
  promo: 'flash-deal',
  slots: 'last-openings',
  giveaway: 'social-proof',
};

export function marketingSavedTemplateCategoryId(
  record: MarketingTemplateRecord
): string | undefined {
  const categoryId = record.designJson.categoryId ?? record.designJson.category;
  return typeof categoryId === 'string' ? categoryId : undefined;
}

/** Normalize a saved video row’s category into the Video-only catalog. */
export function marketingVideoSavedCategoryId(record: MarketingTemplateRecord): string | undefined {
  const raw = marketingSavedTemplateCategoryId(record);
  if (!raw) return undefined;
  if (isVideoCategory(raw)) return raw;
  return VIDEO_LEGACY_CATEGORY_MAP[raw] ?? 'soft-stay';
}

export function marketingSavedTemplateAspect(record: MarketingTemplateRecord): string | null {
  if (record.aspectPreset) return record.aspectPreset;
  const format = record.designJson.format;
  return typeof format === 'string' ? format : null;
}

export function marketingSavedTemplateMatchesFormat(
  record: MarketingTemplateRecord,
  format: string
): boolean {
  const aspect = marketingSavedTemplateAspect(record);
  return !aspect || aspect === format;
}

/** Design sidebar: only explicit custom saves, not preset autosave rows. */
export function marketingDesignSidebarRecords(
  records: MarketingTemplateRecord[]
): MarketingTemplateRecord[] {
  return records.filter((record) => {
    if (record.contentType !== 'design') return true;
    return isDesignCustomTemplate(record);
  });
}

/**
 * Related saved rows (Instagram Post / Story / Facebook Post) for rename/move/archive/remove.
 * Groups by `aiGenerationId` so one AI generate’s three formats stay in sync.
 */
export function planSavedTemplateRelatedIds(
  templates: MarketingTemplateRecord[],
  targetId: string
): string[] {
  const target = templates.find((template) => template.id === targetId);
  if (!target) return [targetId];

  const generationId =
    typeof target.designJson.aiGenerationId === 'string' && target.designJson.aiGenerationId.trim()
      ? target.designJson.aiGenerationId.trim()
      : null;
  if (!generationId) return [targetId];

  const related = templates.filter((template) => {
    if (template.contentType !== target.contentType) return false;
    const value = template.designJson.aiGenerationId;
    return typeof value === 'string' && value.trim() === generationId;
  });
  const ids = related.map((template) => template.id);
  return ids.length > 0 ? [...new Set(ids)] : [targetId];
}
