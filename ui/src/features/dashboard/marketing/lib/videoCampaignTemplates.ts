import type { CampaignCategory } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import type { VideoTemplateFields } from '@/features/dashboard/marketing/lib/designCanvasTypes';

export type VideoCampaignTemplateDef = {
  id: string;
  name: string;
  category: CampaignCategory;
  swatchPrimary: string;
  swatchSecondary: string;
};

const ORANGE = '#e8752a';
const CREAM = '#fff8f0';
const GREEN = '#16a34a';
const RED = '#dc2626';

export const VIDEO_CAMPAIGN_TEMPLATES: VideoCampaignTemplateDef[] = [
  {
    id: 'promo-500-off',
    name: '₱500 off',
    category: 'promo',
    swatchPrimary: ORANGE,
    swatchSecondary: CREAM,
  },
  {
    id: 'promo-300-off',
    name: '₱300 off',
    category: 'promo',
    swatchPrimary: '#fb923c',
    swatchSecondary: CREAM,
  },
  {
    id: 'promo-10-off',
    name: '10% off',
    category: 'promo',
    swatchPrimary: '#ea580c',
    swatchSecondary: '#fef3c7',
  },
  {
    id: 'promo-free-breakfast',
    name: 'Free breakfast',
    category: 'promo',
    swatchPrimary: GREEN,
    swatchSecondary: CREAM,
  },
  {
    id: 'promo-free-parking',
    name: 'Free parking',
    category: 'promo',
    swatchPrimary: '#2563eb',
    swatchSecondary: CREAM,
  },
  {
    id: 'slots-1',
    name: 'Last 1 slot',
    category: 'slots',
    swatchPrimary: '#2563eb',
    swatchSecondary: '#ffffff',
  },
  {
    id: 'slots-3',
    name: 'Last 3 slots',
    category: 'slots',
    swatchPrimary: ORANGE,
    swatchSecondary: '#ffffff',
  },
  {
    id: 'slots-5',
    name: 'Last 5 slots',
    category: 'slots',
    swatchPrimary: RED,
    swatchSecondary: '#ffffff',
  },
  {
    id: 'giveaway',
    name: 'Giveaway',
    category: 'giveaway',
    swatchPrimary: RED,
    swatchSecondary: ORANGE,
  },
  {
    id: 'fully-booked',
    name: 'Fully booked',
    category: 'fully-booked',
    swatchPrimary: '#64748b',
    swatchSecondary: CREAM,
  },
];

export function videoTemplatesForCategory(category?: CampaignCategory) {
  return VIDEO_CAMPAIGN_TEMPLATES.filter((t) => !category || t.category === category);
}

export function defaultVideoFields(
  templateId: string,
  binding: DesignBinding
): VideoTemplateFields {
  const month = binding.monthShort.toUpperCase();

  switch (templateId) {
    case 'promo-500-off':
      return {
        headline: 'RAINY DAY PROMO',
        subheadline: 'UP TO',
        promoLine: '₱500 OFF',
        ctaLine: 'FOR WEEKDAY BOOKINGS',
        slotLabels: [],
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'promo-300-off':
      return {
        headline: 'WEEKDAY PROMO',
        subheadline: 'UP TO',
        promoLine: '₱300 OFF',
        ctaLine: 'MON–THU STAYS',
        slotLabels: [],
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'promo-10-off':
      return {
        headline: 'BER MONTHS PROMO',
        subheadline: 'UP TO',
        promoLine: '10% OFF',
        ctaLine: 'LIMITED TIME',
        slotLabels: [],
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'promo-free-breakfast':
      return {
        headline: 'STAY PROMO',
        subheadline: '',
        promoLine: 'FREE BREAKFAST',
        ctaLine: 'SELECT DATES',
        slotLabels: [],
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'promo-free-parking':
      return {
        headline: 'PARKING PERK',
        subheadline: '',
        promoLine: 'FREE PARKING',
        ctaLine: 'THIS MONTH',
        slotLabels: [],
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'slots-1':
      return {
        headline: 'LAST SLOT',
        subheadline: `FOR ${month}`,
        promoLine: '',
        ctaLine: 'BOOK NOW',
        slotLabels: binding.openSlots.slice(0, 1).map((s) => `${s.dateNum} · ${s.dayName}`),
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'slots-3':
      return {
        headline: 'LAST 3 SLOTS',
        subheadline: `FOR ${month}`,
        promoLine: '',
        ctaLine: 'BOOK NOW',
        slotLabels: binding.openSlots.slice(0, 3).map((s) => `${s.dateNum} · ${s.dayName}`),
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'slots-5':
      return {
        headline: 'LAST 5 SLOTS',
        subheadline: `FOR ${month}`,
        promoLine: '',
        ctaLine: 'BOOK NOW',
        slotLabels: binding.openSlots.slice(0, 5).map((s) => `${s.dateNum} · ${s.dayName}`),
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'giveaway':
      return {
        headline: `${month} GIVEAWAY`,
        subheadline: 'FREE 2D1N STAYCATION',
        promoLine: 'WITH POOL ACCESS',
        ctaLine: 'Like · Tag · Share',
        slotLabels: [],
        rulesLine: binding.propertyName.toUpperCase(),
      };
    case 'fully-booked':
      return {
        headline: 'FULLY BOOKED',
        subheadline: `FOR ${month}`,
        promoLine: 'Watch for next month openings',
        ctaLine: '',
        slotLabels: [],
        rulesLine: binding.propertyName.toUpperCase(),
      };
    default:
      return {
        headline: binding.propertyName,
        subheadline: binding.nightlyRate,
        promoLine: binding.availabilityText,
        ctaLine: 'Book direct',
        slotLabels: [],
        rulesLine: binding.propertyName.toUpperCase(),
      };
  }
}

export function getVideoCampaignTemplate(id: string) {
  return VIDEO_CAMPAIGN_TEMPLATES.find((t) => t.id === id);
}
