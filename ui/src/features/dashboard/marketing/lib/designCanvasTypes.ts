import type { DesignTemplateFormat } from '@/features/dashboard/marketing/lib/templateRegistry';

export type CampaignCategory = 'promo' | 'slots' | 'giveaway' | 'fully-booked';

export const CAMPAIGN_CATEGORY_LABELS: Record<CampaignCategory, string> = {
  promo: 'Promos',
  slots: 'Last slots',
  giveaway: 'Giveaway',
  'fully-booked': 'Fully booked',
};

export type DesignBindingMedia = {
  url: string;
  type: 'image' | 'video';
};

export type DesignBinding = {
  propertyName: string;
  propertyPhoto: string | null;
  /** Ordered gallery from property settings (primary first). */
  propertyMedia?: DesignBindingMedia[];
  nightlyRate: string;
  availabilityText: string;
  monthLabel: string;
  monthShort: string;
  openSlots: Array<{ dateNum: string; dayName: string }>;
};

export type CampaignTemplateDef = {
  id: string;
  name: string;
  category: CampaignCategory;
  format: DesignTemplateFormat;
  preview: { primary: string; secondary?: string };
};

export type VideoCampaignCategory = CampaignCategory;

export type VideoTemplateFields = {
  headline: string;
  subheadline: string;
  promoLine: string;
  ctaLine: string;
  slotLabels: string[];
  rulesLine: string;
};
