import {
  defaultPropertyShowcaseConfig,
  normalizeShowcasePaletteMode,
  type PropertyShowcaseConfig,
  type ShowcaseTextSourceConfig,
} from '@/features/guest/marketing/showcase/types/showcase';

import type { StayGuideSectionConfig } from '@/features/guest/stay-guide/lib/api';
import { defaultStayGuideSectionConfig } from '@/features/guest/stay-guide/lib/stayGuideChapters';

export const STAY_GUIDE_CHAPTER_SECTION_IDS = [
  'getting-in',
  'make-yourself-at-home',
  'before-you-go',
] as const;
export type StayGuideChapterSectionId = (typeof STAY_GUIDE_CHAPTER_SECTION_IDS)[number];

export const STAY_GUIDE_SECTION_IDS = [
  'hero',
  'passCard',
  'checkInDocuments',
  'gallery',
  'quickNav',
  'getting-in',
  'make-yourself-at-home',
  'before-you-go',
  'host',
] as const;
export type StayGuideSectionId = (typeof STAY_GUIDE_SECTION_IDS)[number];

export const STAY_GUIDE_REQUIRED_VISIBLE: ReadonlySet<StayGuideSectionId> = new Set(['hero']);

const LEGACY_SECTION_IDS: Record<string, StayGuideSectionId> = {
  stayPassCard: 'passCard',
  galleryCarousel: 'gallery',
  quickNavTabs: 'quickNav',
  helpSection: 'host',
};

export function isStayGuideChapterSectionId(id: string): id is StayGuideChapterSectionId {
  return (STAY_GUIDE_CHAPTER_SECTION_IDS as readonly string[]).includes(id);
}

function isStayGuideSectionId(id: string): id is StayGuideSectionId {
  return (STAY_GUIDE_SECTION_IDS as readonly string[]).includes(id);
}

export type StayGuideSectionConfigEntry = {
  id: StayGuideSectionId;
  visible: boolean;
  order: number;
  copy?: { heading?: string; subheading?: string; body?: string };
  imageSlots?: string[];
  heroEyebrow?: ShowcaseTextSourceConfig;
  accentColor?: string | null;
};

export type StayGuideConfigV2 = {
  version: 2;
  published: boolean;
  palette: PropertyShowcaseConfig['palette'];
  typography: PropertyShowcaseConfig['typography'];
  motion: PropertyShowcaseConfig['motion'];
  sections: StayGuideSectionConfigEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function readVisibleFlag(value: unknown, fallback: boolean): boolean {
  if (!isRecord(value) || typeof value.visible !== 'boolean') return fallback;
  return value.visible;
}

function normalizeAccentColor(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stayGuideConfigIsV1(raw: Record<string, unknown>): boolean {
  return raw.version === 1 || Array.isArray(raw.chapters);
}

function normalizeStayGuideCopy(
  raw: unknown
): { heading?: string; subheading?: string; body?: string } | undefined {
  if (!isRecord(raw)) return undefined;
  const heading = readOptionalString(raw.heading, 120);
  const subheading = readOptionalString(raw.subheading, 200);
  const body = readOptionalString(raw.body, 4000);
  if (!heading && !subheading && !body) return undefined;
  return { heading, subheading, body };
}

function normalizeStayGuideImageSlots(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const slots = raw
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 24);
  return slots.length > 0 ? slots : undefined;
}

function normalizeStayGuideTextSource(raw: unknown): ShowcaseTextSourceConfig | undefined {
  if (!isRecord(raw)) return undefined;
  const source = raw.source;
  if (source !== 'location' && source !== 'development' && source !== 'custom') return undefined;
  const customText = readOptionalString(raw.customText, 120);
  if (source === 'custom') return { source: 'custom', customText };
  if (source === 'development') return { source: 'development' };
  return { source: 'location' };
}

function resolveSectionId(raw: unknown): StayGuideSectionId | null {
  if (typeof raw !== 'string') return null;
  if (isStayGuideSectionId(raw)) return raw;
  return LEGACY_SECTION_IDS[raw] ?? null;
}

export function defaultStayGuideConfigV2(): StayGuideConfigV2 {
  const showcase = defaultPropertyShowcaseConfig();
  return {
    version: 2,
    published: true,
    palette: showcase.palette,
    typography: showcase.typography,
    motion: showcase.motion,
    sections: STAY_GUIDE_SECTION_IDS.map((id, order) => ({
      id,
      visible: true,
      order,
      accentColor: isStayGuideChapterSectionId(id) ? null : undefined,
    })),
  };
}

export function upgradeStayGuideConfigV1toV2(raw: Record<string, unknown>): StayGuideConfigV2 {
  const base = defaultStayGuideConfigV2();

  const chapterOrder = new Map<StayGuideChapterSectionId, number>();
  const chapterVisible = new Map<StayGuideChapterSectionId, boolean>();
  const chapterAccent = new Map<StayGuideChapterSectionId, string | null>();
  if (Array.isArray(raw.chapters)) {
    raw.chapters.forEach((entry, index) => {
      if (!isRecord(entry)) return;
      const id = entry.id;
      if (typeof id !== 'string' || !isStayGuideChapterSectionId(id)) return;
      chapterOrder.set(
        id,
        typeof entry.order === 'number' && Number.isFinite(entry.order) ? entry.order : index
      );
      chapterVisible.set(id, typeof entry.visible === 'boolean' ? entry.visible : true);
      chapterAccent.set(id, normalizeAccentColor(entry.accentColor));
    });
  }

  const nonChapterVisible: Record<
    Exclude<StayGuideSectionId, StayGuideChapterSectionId>,
    boolean
  > = {
    hero: readVisibleFlag(raw.hero, true),
    passCard: readVisibleFlag(raw.stayPassCard, true),
    checkInDocuments: readVisibleFlag(raw.checkInDocuments, true),
    gallery: readVisibleFlag(raw.galleryCarousel, true),
    quickNav: readVisibleFlag(raw.quickNavTabs, true),
    host: readVisibleFlag(raw.helpSection, true),
  };

  const sortedChapters = [...STAY_GUIDE_CHAPTER_SECTION_IDS].sort(
    (a, b) =>
      (chapterOrder.get(a) ?? STAY_GUIDE_CHAPTER_SECTION_IDS.indexOf(a)) -
      (chapterOrder.get(b) ?? STAY_GUIDE_CHAPTER_SECTION_IDS.indexOf(b))
  );

  const orderedIds: StayGuideSectionId[] = [...STAY_GUIDE_SECTION_IDS];
  const firstChapterSlot = orderedIds.indexOf('getting-in');
  sortedChapters.forEach((id, index) => {
    orderedIds[firstChapterSlot + index] = id;
  });

  return {
    ...base,
    sections: orderedIds.map((id, order) =>
      isStayGuideChapterSectionId(id)
        ? {
            id,
            visible: chapterVisible.get(id) ?? true,
            order,
            accentColor: chapterAccent.get(id) ?? null,
          }
        : {
            id,
            visible: nonChapterVisible[id],
            order,
          }
    ),
  };
}

function normalizePalette(raw: unknown): StayGuideConfigV2['palette'] {
  const base = defaultPropertyShowcaseConfig().palette;
  if (!isRecord(raw)) return base;
  const accent = raw.accent === 'custom' ? 'custom' : 'brand';
  const overlay =
    raw.overlay === 'none' || raw.overlay === 'soft' || raw.overlay === 'strong'
      ? raw.overlay
      : base.overlay;
  return {
    mode: normalizeShowcasePaletteMode(raw.mode),
    accent,
    customAccent: typeof raw.customAccent === 'string' ? raw.customAccent : null,
    customPaletteBase: typeof raw.customPaletteBase === 'string' ? raw.customPaletteBase : null,
    overlay,
  };
}

function normalizeTypography(raw: unknown): StayGuideConfigV2['typography'] {
  const base = defaultPropertyShowcaseConfig().typography;
  if (!isRecord(raw)) return base;
  const fonts = ['jakarta', 'outfit', 'instrument', 'cormorant', 'fraunces'] as const;
  const displayFont = fonts.find((font) => font === raw.displayFont) ?? base.displayFont;
  const scale =
    raw.scale === 'sm' || raw.scale === 'md' || raw.scale === 'lg' ? raw.scale : base.scale;
  return { displayFont, scale };
}

function normalizeMotion(raw: unknown): StayGuideConfigV2['motion'] {
  const base = defaultPropertyShowcaseConfig().motion;
  if (!isRecord(raw)) return base;
  const intensity =
    raw.intensity === 'subtle' || raw.intensity === 'standard' || raw.intensity === 'bold'
      ? raw.intensity
      : base.intensity;
  return {
    intensity,
    parallax: typeof raw.parallax === 'boolean' ? raw.parallax : base.parallax,
    canvas: typeof raw.canvas === 'boolean' ? raw.canvas : base.canvas,
  };
}

export function normalizeStayGuideConfigV2(raw: unknown): StayGuideConfigV2 {
  const base = defaultStayGuideConfigV2();
  if (!isRecord(raw)) return base;
  if (stayGuideConfigIsV1(raw)) return upgradeStayGuideConfigV1toV2(raw);

  const byId = new Map<StayGuideSectionId, StayGuideSectionConfigEntry>();
  for (const entry of base.sections) byId.set(entry.id, { ...entry });

  if (Array.isArray(raw.sections)) {
    raw.sections.forEach((entry, index) => {
      if (!isRecord(entry)) return;
      const sectionId = resolveSectionId(entry.id);
      if (!sectionId) return;
      const existing = byId.get(sectionId)!;
      byId.set(sectionId, {
        id: sectionId,
        visible: STAY_GUIDE_REQUIRED_VISIBLE.has(sectionId)
          ? true
          : typeof entry.visible === 'boolean'
            ? entry.visible
            : existing.visible,
        order:
          typeof entry.order === 'number' && Number.isFinite(entry.order)
            ? entry.order
            : (existing.order ?? index),
        copy: normalizeStayGuideCopy(entry.copy),
        imageSlots:
          sectionId === 'hero' || sectionId === 'gallery'
            ? normalizeStayGuideImageSlots(entry.imageSlots)
            : undefined,
        heroEyebrow:
          sectionId === 'hero' ? normalizeStayGuideTextSource(entry.heroEyebrow) : undefined,
        accentColor: isStayGuideChapterSectionId(sectionId)
          ? normalizeAccentColor(entry.accentColor)
          : undefined,
      });
    });
  }

  const sections = [...byId.values()].sort((a, b) => a.order - b.order);
  sections.forEach((section, order) => {
    section.order = order;
  });

  return {
    version: 2,
    published: typeof raw.published === 'boolean' ? raw.published : true,
    palette: normalizePalette(raw.palette),
    typography: normalizeTypography(raw.typography),
    motion: normalizeMotion(raw.motion),
    sections,
  };
}

function sectionVisible(config: StayGuideConfigV2, id: StayGuideSectionId): boolean {
  return config.sections.find((section) => section.id === id)?.visible ?? true;
}

/** Guest Stay Guide page still reads the v1 layout flags. */
export function stayGuideConfigV2ToV1(config: StayGuideConfigV2): StayGuideSectionConfig {
  const defaults = defaultStayGuideSectionConfig();
  const chapters = config.sections
    .filter((section): section is StayGuideSectionConfigEntry & { id: StayGuideChapterSectionId } =>
      isStayGuideChapterSectionId(section.id)
    )
    .sort((a, b) => a.order - b.order)
    .map((section, order) => ({
      id: section.id,
      visible: section.visible,
      order,
      accentColor: section.accentColor ?? null,
    }));

  return {
    version: 1,
    hero: { visible: sectionVisible(config, 'hero') },
    stayPassCard: { visible: sectionVisible(config, 'passCard') },
    checkInDocuments: { visible: sectionVisible(config, 'checkInDocuments') },
    galleryCarousel: { visible: sectionVisible(config, 'gallery') },
    quickNavTabs: { visible: sectionVisible(config, 'quickNav') },
    helpSection: { visible: sectionVisible(config, 'host') },
    chapters: chapters.length > 0 ? chapters : defaults.chapters,
  };
}
