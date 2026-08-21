import { KeyRound, LogOut, MessageCircle, ScrollText, type LucideIcon } from 'lucide-react';

import type {
  StayGuideChapterConfig,
  StayGuideSectionConfig,
  StayGuideSectionDto,
} from '@/features/guest/stay-guide/lib/api';

export type StayGuideChapterId =
  'getting-in' | 'make-yourself-at-home' | 'before-you-go' | 'need-anything';

export type StayGuideChapterDef = {
  id: StayGuideChapterId;
  eyebrow: string;
  heading: string;
  shortLabel: string;
  icon: LucideIcon;
  sections: StayGuideSectionDto[];
  /** Host override; null/undefined = brand/primary. */
  accentColor?: string | null;
};

/** "Need Anything?" is content-less — it anchors quick-nav to the host contact footer. */
export type StayGuideChapterNavItem = Pick<
  StayGuideChapterDef,
  'id' | 'shortLabel' | 'icon' | 'heading'
>;

function sectionByKey(
  sections: StayGuideSectionDto[],
  key: string
): StayGuideSectionDto | undefined {
  return sections.find((s) => s.key === key);
}

/** Groups the four standard sections into the chaptered stay-guide layout. */
export function buildStayGuideChapters(sections: StayGuideSectionDto[]): StayGuideChapterDef[] {
  const chapters: Omit<StayGuideChapterDef, 'eyebrow'>[] = [];

  const checkIn = sectionByKey(sections, 'check-in-instructions');
  if (checkIn) {
    chapters.push({
      id: 'getting-in',
      heading: 'Getting In',
      shortLabel: 'Getting in',
      icon: KeyRound,
      sections: [checkIn],
    });
  }

  const homeSections = [
    sectionByKey(sections, 'house-rules'),
    sectionByKey(sections, 'parking-reminders'),
  ].filter((s): s is StayGuideSectionDto => Boolean(s));
  if (homeSections.length > 0) {
    chapters.push({
      id: 'make-yourself-at-home',
      heading: 'Make Yourself at Home',
      shortLabel: 'At home',
      icon: ScrollText,
      sections: homeSections,
    });
  }

  const checkOut = sectionByKey(sections, 'check-out-instructions');
  if (checkOut) {
    chapters.push({
      id: 'before-you-go',
      heading: 'Before You Go',
      shortLabel: 'Before you go',
      icon: LogOut,
      sections: [checkOut],
    });
  }

  return chapters.map((chapter, index) => ({
    ...chapter,
    eyebrow: `Chapter 0${index + 1}`,
  }));
}

const DEFAULT_CHAPTER_ORDER: StayGuideChapterConfig['id'][] = [
  'getting-in',
  'make-yourself-at-home',
  'before-you-go',
];

export function defaultStayGuideSectionConfig(): StayGuideSectionConfig {
  return {
    version: 1,
    hero: { visible: true },
    stayPassCard: { visible: true },
    galleryCarousel: { visible: true },
    quickNavTabs: { visible: true },
    chapters: DEFAULT_CHAPTER_ORDER.map((id, order) => ({
      id,
      visible: true,
      order,
      accentColor: null,
    })),
    helpSection: { visible: true },
  };
}

/**
 * Filter/reorder built chapters by host sectionConfig.
 * Missing/default config preserves today's natural order and visibility.
 */
export function applyStayGuideSectionConfig(
  chapters: StayGuideChapterDef[],
  sectionConfig?: StayGuideSectionConfig | null
): StayGuideChapterDef[] {
  const config = sectionConfig ?? defaultStayGuideSectionConfig();
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const chapterConfigs = [...config.chapters].sort(
    (a, b) =>
      a.order - b.order || DEFAULT_CHAPTER_ORDER.indexOf(a.id) - DEFAULT_CHAPTER_ORDER.indexOf(b.id)
  );

  const ordered: StayGuideChapterDef[] = [];
  for (const entry of chapterConfigs) {
    if (!entry.visible) continue;
    const chapter = byId.get(entry.id);
    if (!chapter) continue;
    ordered.push({
      ...chapter,
      accentColor: entry.accentColor,
    });
  }

  return ordered.map((chapter, index) => ({
    ...chapter,
    eyebrow: `Chapter 0${index + 1}`,
  }));
}

export const NEED_ANYTHING_CHAPTER: StayGuideChapterNavItem = {
  id: 'need-anything',
  heading: 'Need Anything?',
  shortLabel: 'Need help',
  icon: MessageCircle,
};

export function buildQuickNavItems(
  chapters: StayGuideChapterDef[],
  options?: { includeHelp?: boolean }
): StayGuideChapterNavItem[] {
  const includeHelp = options?.includeHelp !== false;
  const items = chapters.map(({ id, shortLabel, icon, heading }) => ({
    id,
    shortLabel,
    icon,
    heading,
  }));
  if (includeHelp) items.push(NEED_ANYTHING_CHAPTER);
  return items;
}
