import type { StayGuideChapterConfig } from '@/features/guest/stay-guide/lib/api';

import { STANDARD_TEMPLATE_SECTIONS } from '@/features/dashboard/bookings/lib/propertyTemplateSections';

import type { LucideIcon } from 'lucide-react';

export type StayGuideEditableSection = {
  templateKey: string;
  label: string;
  icon: LucideIcon;
};

/** Chapter → standard template keys (same grouping as the guest Stay Guide). */
export const STAY_GUIDE_CHAPTER_SECTIONS: Record<
  StayGuideChapterConfig['id'],
  StayGuideEditableSection[]
> = {
  'getting-in': STANDARD_TEMPLATE_SECTIONS.filter(
    (s) => s.templateKey === 'check-in-instructions'
  ).map((s) => ({ templateKey: s.templateKey, label: s.label, icon: s.icon })),
  'make-yourself-at-home': STANDARD_TEMPLATE_SECTIONS.filter(
    (s) => s.templateKey === 'house-rules' || s.templateKey === 'parking-reminders'
  ).map((s) => ({ templateKey: s.templateKey, label: s.label, icon: s.icon })),
  'before-you-go': STANDARD_TEMPLATE_SECTIONS.filter(
    (s) => s.templateKey === 'check-out-instructions'
  ).map((s) => ({ templateKey: s.templateKey, label: s.label, icon: s.icon })),
};

export const STAY_GUIDE_STANDARD_TEMPLATE_KEYS = Object.values(STAY_GUIDE_CHAPTER_SECTIONS)
  .flat()
  .map((s) => s.templateKey);

export const CHAPTER_LABELS: Record<StayGuideChapterConfig['id'], string> = {
  'getting-in': 'Getting In',
  'make-yourself-at-home': 'Make Yourself at Home',
  'before-you-go': 'Before You Go',
};
