import type {
  CampaignCategory,
  CampaignTemplateDef,
} from '@/features/dashboard/marketing/lib/designCanvasTypes';
import {
  DESIGN_FORMAT_DIMENSIONS,
  type DesignTemplateFormat,
} from '@/features/dashboard/marketing/lib/templateRegistry';

const ORANGE = '#e8752a';
const CREAM = '#fff8f0';
const GREEN = '#16a34a';
const RED = '#dc2626';

type BaseCampaignTemplate = {
  baseId: string;
  name: string;
  category: CampaignCategory;
  formats: DesignTemplateFormat[];
  preview: { primary: string; secondary?: string };
};

const BASE_TEMPLATES: BaseCampaignTemplate[] = [
  {
    baseId: 'promo-500-off',
    name: '₱500 off',
    category: 'promo',
    formats: ['instagram-post', 'instagram-story'],
    preview: { primary: ORANGE, secondary: CREAM },
  },
  {
    baseId: 'promo-300-off',
    name: '₱300 off',
    category: 'promo',
    formats: ['instagram-post', 'instagram-story'],
    preview: { primary: '#fb923c', secondary: CREAM },
  },
  {
    baseId: 'promo-10-off',
    name: '10% off',
    category: 'promo',
    formats: ['instagram-post', 'facebook-post'],
    preview: { primary: '#ea580c', secondary: '#fef3c7' },
  },
  {
    baseId: 'promo-free-breakfast',
    name: 'Free breakfast',
    category: 'promo',
    formats: ['instagram-post', 'instagram-story'],
    preview: { primary: GREEN, secondary: CREAM },
  },
  {
    baseId: 'promo-free-parking',
    name: 'Free parking',
    category: 'promo',
    formats: ['instagram-post', 'facebook-post'],
    preview: { primary: '#2563eb', secondary: CREAM },
  },
  {
    baseId: 'slots-1',
    name: 'Last 1 slot',
    category: 'slots',
    formats: ['instagram-post', 'instagram-story'],
    preview: { primary: '#2563eb', secondary: '#ffffff' },
  },
  {
    baseId: 'slots-3',
    name: 'Last 3 slots',
    category: 'slots',
    formats: ['instagram-post', 'instagram-story'],
    preview: { primary: ORANGE, secondary: '#ffffff' },
  },
  {
    baseId: 'slots-5',
    name: 'Last 5 slots',
    category: 'slots',
    formats: ['instagram-post', 'instagram-story'],
    preview: { primary: RED, secondary: '#ffffff' },
  },
  {
    baseId: 'giveaway',
    name: 'Giveaway',
    category: 'giveaway',
    formats: ['instagram-post', 'instagram-story'],
    preview: { primary: RED, secondary: ORANGE },
  },
  {
    baseId: 'fully-booked',
    name: 'Fully booked',
    category: 'fully-booked',
    formats: ['instagram-post', 'instagram-story', 'facebook-post'],
    preview: { primary: '#64748b', secondary: CREAM },
  },
];

export const DESIGN_CAMPAIGN_TEMPLATES: CampaignTemplateDef[] = BASE_TEMPLATES.flatMap((base) =>
  base.formats.map((format) => ({
    id: `${base.baseId}-${format}`,
    name: base.name,
    category: base.category,
    format,
    preview: base.preview,
  }))
);

export function campaignTemplatesForFormat(
  format: DesignTemplateFormat,
  category?: CampaignCategory
) {
  return DESIGN_CAMPAIGN_TEMPLATES.filter(
    (t) => t.format === format && (!category || t.category === category)
  );
}

export function getCampaignTemplate(id: string) {
  return DESIGN_CAMPAIGN_TEMPLATES.find((t) => t.id === id);
}

export function campaignTemplateBaseId(id: string) {
  const template = getCampaignTemplate(id);
  if (!template) return id;
  return id.replace(`-${template.format}`, '');
}

export { DESIGN_FORMAT_DIMENSIONS };
