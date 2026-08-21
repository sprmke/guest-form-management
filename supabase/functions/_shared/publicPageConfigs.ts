/**
 * Public page section configs — visibility, order, light style overrides.
 * Host paths lazily create rows; guest render paths read-only with in-memory defaults.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type PublicPageType = 'stay_guide' | 'property_landing';

export type StayGuideChapterId = 'getting-in' | 'make-yourself-at-home' | 'before-you-go';

export type StayGuideChapterConfig = {
  id: StayGuideChapterId;
  visible: boolean;
  order: number;
  /** null = inherit brand color */
  accentColor: string | null;
};

export type StayGuideConfig = {
  version: 1;
  hero: { visible: boolean };
  stayPassCard: { visible: boolean };
  galleryCarousel: { visible: boolean };
  quickNavTabs: { visible: boolean };
  chapters: StayGuideChapterConfig[];
  helpSection: { visible: boolean };
};

export type PropertyLandingSectionId =
  'gallery' | 'overview' | 'amenities' | 'location' | 'rules' | 'reviews';

export type PropertyLandingSectionConfig = {
  id: PropertyLandingSectionId;
  visible: boolean;
  order: number;
};

export type PropertyLandingConfig = {
  version: 1;
  sections: PropertyLandingSectionConfig[];
};

export type PublicPageConfigRow = {
  id: string;
  propertyId: string;
  pageType: PublicPageType;
  config: StayGuideConfig | PropertyLandingConfig;
  createdAt: string;
  updatedAt: string;
};

const STAY_GUIDE_CHAPTER_IDS: StayGuideChapterId[] = [
  'getting-in',
  'make-yourself-at-home',
  'before-you-go',
];

const PROPERTY_LANDING_SECTION_IDS: PropertyLandingSectionId[] = [
  'gallery',
  'overview',
  'amenities',
  'location',
  'rules',
  'reviews',
];

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export function defaultStayGuideConfig(): StayGuideConfig {
  return {
    version: 1,
    hero: { visible: true },
    stayPassCard: { visible: true },
    galleryCarousel: { visible: true },
    quickNavTabs: { visible: true },
    chapters: STAY_GUIDE_CHAPTER_IDS.map((id, order) => ({
      id,
      visible: true,
      order,
      accentColor: null,
    })),
    helpSection: { visible: true },
  };
}

export function defaultPropertyLandingConfig(): PropertyLandingConfig {
  return {
    version: 1,
    sections: PROPERTY_LANDING_SECTION_IDS.map((id, order) => ({
      id,
      visible: true,
      order,
    })),
  };
}

function defaultConfigFor(pageType: PublicPageType): StayGuideConfig | PropertyLandingConfig {
  return pageType === 'stay_guide' ? defaultStayGuideConfig() : defaultPropertyLandingConfig();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

export function normalizeStayGuideConfig(raw: unknown): StayGuideConfig {
  const base = defaultStayGuideConfig();
  if (!isRecord(raw)) return base;

  const chapterById = new Map<StayGuideChapterId, StayGuideChapterConfig>();
  for (const chapter of base.chapters) {
    chapterById.set(chapter.id, { ...chapter });
  }

  if (Array.isArray(raw.chapters)) {
    for (const entry of raw.chapters) {
      if (!isRecord(entry)) continue;
      const id = entry.id;
      if (id !== 'getting-in' && id !== 'make-yourself-at-home' && id !== 'before-you-go') continue;
      const existing = chapterById.get(id)!;
      chapterById.set(id, {
        id,
        visible: typeof entry.visible === 'boolean' ? entry.visible : existing.visible,
        order:
          typeof entry.order === 'number' && Number.isFinite(entry.order)
            ? entry.order
            : existing.order,
        accentColor: normalizeAccentColor(entry.accentColor),
      });
    }
  }

  const chapters = STAY_GUIDE_CHAPTER_IDS.map((id) => chapterById.get(id)!).sort(
    (a, b) =>
      a.order - b.order ||
      STAY_GUIDE_CHAPTER_IDS.indexOf(a.id) - STAY_GUIDE_CHAPTER_IDS.indexOf(b.id)
  );
  chapters.forEach((chapter, index) => {
    chapter.order = index;
  });

  return {
    version: 1,
    hero: { visible: readVisibleFlag(raw.hero, base.hero.visible) },
    stayPassCard: { visible: readVisibleFlag(raw.stayPassCard, base.stayPassCard.visible) },
    galleryCarousel: {
      visible: readVisibleFlag(raw.galleryCarousel, base.galleryCarousel.visible),
    },
    quickNavTabs: { visible: readVisibleFlag(raw.quickNavTabs, base.quickNavTabs.visible) },
    chapters,
    helpSection: { visible: readVisibleFlag(raw.helpSection, base.helpSection.visible) },
  };
}

export function normalizePropertyLandingConfig(raw: unknown): PropertyLandingConfig {
  const base = defaultPropertyLandingConfig();
  if (!isRecord(raw)) return base;

  const sectionById = new Map<PropertyLandingSectionId, PropertyLandingSectionConfig>();
  for (const section of base.sections) {
    sectionById.set(section.id, { ...section });
  }

  if (Array.isArray(raw.sections)) {
    for (const entry of raw.sections) {
      if (!isRecord(entry)) continue;
      const id = entry.id;
      if (
        id !== 'gallery' &&
        id !== 'overview' &&
        id !== 'amenities' &&
        id !== 'location' &&
        id !== 'rules' &&
        id !== 'reviews'
      ) {
        continue;
      }
      const existing = sectionById.get(id)!;
      sectionById.set(id, {
        id,
        visible: typeof entry.visible === 'boolean' ? entry.visible : existing.visible,
        order:
          typeof entry.order === 'number' && Number.isFinite(entry.order)
            ? entry.order
            : existing.order,
      });
    }
  }

  const sections = PROPERTY_LANDING_SECTION_IDS.map((id) => sectionById.get(id)!).sort(
    (a, b) =>
      a.order - b.order ||
      PROPERTY_LANDING_SECTION_IDS.indexOf(a.id) - PROPERTY_LANDING_SECTION_IDS.indexOf(b.id)
  );
  sections.forEach((section, index) => {
    section.order = index;
  });

  return { version: 1, sections };
}

export function normalizePublicPageConfig(
  pageType: PublicPageType,
  raw: unknown
): StayGuideConfig | PropertyLandingConfig {
  return pageType === 'stay_guide'
    ? normalizeStayGuideConfig(raw)
    : normalizePropertyLandingConfig(raw);
}

export function parsePublicPageType(value: unknown): PublicPageType | null {
  if (value === 'stay_guide' || value === 'property_landing') return value;
  return null;
}

function toRow(
  row: {
    id: string;
    property_id: string;
    page_type: string;
    config: unknown;
    created_at: string;
    updated_at: string;
  },
  pageType: PublicPageType
): PublicPageConfigRow {
  return {
    id: row.id,
    propertyId: row.property_id,
    pageType,
    config: normalizePublicPageConfig(pageType, row.config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Guest/public read path — never inserts. Missing row → in-memory defaults. */
export async function getPublicPageConfigOrDefault(
  propertyId: string,
  pageType: PublicPageType
): Promise<StayGuideConfig | PropertyLandingConfig> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('public_page_configs')
    .select('config')
    .eq('property_id', propertyId)
    .eq('page_type', pageType)
    .maybeSingle();

  if (error) {
    console.error('[publicPageConfigs] getPublicPageConfigOrDefault:', error);
    return defaultConfigFor(pageType);
  }

  if (!data) return defaultConfigFor(pageType);
  return normalizePublicPageConfig(pageType, data.config);
}

/** Host path — create with defaults on first read. */
export async function getOrCreatePublicPageConfig(
  propertyId: string,
  pageType: PublicPageType
): Promise<PublicPageConfigRow> {
  const supabase = supabaseAdmin();

  const { data: existing, error: readError } = await supabase
    .from('public_page_configs')
    .select('*')
    .eq('property_id', propertyId)
    .eq('page_type', pageType)
    .maybeSingle();

  if (readError) {
    console.error('[publicPageConfigs] getOrCreatePublicPageConfig read:', readError);
    throw new Error('Failed to load public page config');
  }

  if (existing) return toRow(existing, pageType);

  const { data: created, error: insertError } = await supabase
    .from('public_page_configs')
    .insert({
      property_id: propertyId,
      page_type: pageType,
      config: defaultConfigFor(pageType),
    })
    .select('*')
    .single();

  if (insertError) {
    const { data: retried, error: retryError } = await supabase
      .from('public_page_configs')
      .select('*')
      .eq('property_id', propertyId)
      .eq('page_type', pageType)
      .maybeSingle();

    if (retryError || !retried) {
      console.error('[publicPageConfigs] getOrCreatePublicPageConfig insert:', insertError);
      throw new Error('Failed to create public page config');
    }
    return toRow(retried, pageType);
  }

  return toRow(created, pageType);
}

export async function upsertPublicPageConfig(
  propertyId: string,
  pageType: PublicPageType,
  config: unknown
): Promise<PublicPageConfigRow> {
  const normalized = normalizePublicPageConfig(pageType, config);
  const supabase = supabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('public_page_configs')
    .upsert(
      {
        property_id: propertyId,
        page_type: pageType,
        config: normalized,
        updated_at: now,
      },
      { onConflict: 'property_id,page_type' }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[publicPageConfigs] upsertPublicPageConfig:', error);
    throw new Error('Failed to save public page config');
  }

  return toRow(data, pageType);
}
