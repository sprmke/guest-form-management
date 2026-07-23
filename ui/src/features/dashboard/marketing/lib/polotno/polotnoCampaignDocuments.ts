import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import {
  campaignTemplateBaseId,
  getCampaignTemplate,
} from '@/features/dashboard/marketing/lib/designCampaignTemplates';
import { DESIGN_FORMAT_DIMENSIONS } from '@/features/dashboard/marketing/lib/templateRegistry';
import type { DesignTemplateFormat } from '@/features/dashboard/marketing/lib/templateRegistry';

const ORANGE = '#e8752a';
const BROWN = '#5c3d2e';
const CREAM = '#fff8f0';
const GREEN = '#16a34a';
const RED = '#dc2626';

type PolotnoChild = Record<string, unknown>;

let idCounter = 0;
function uid(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function resetIds() {
  idCounter = 0;
}

/** Layout helpers — typography and chrome scale from the short side so portrait (9:16) matches square density. */
type CampaignLayout = {
  width: number;
  height: number;
  short: number;
  isPortrait: boolean;
  pad: number;
  font: (ratio: number) => number;
  y: (ratio: number) => number;
  w: (ratio: number) => number;
  size: (ratio: number) => number;
};

function createCampaignLayout(width: number, height: number): CampaignLayout {
  const short = Math.min(width, height);
  return {
    width,
    height,
    short,
    isPortrait: height > width * 1.05,
    pad: Math.round(width * 0.044),
    font: (ratio: number) => Math.round(short * ratio),
    y: (ratio: number) => Math.round(height * ratio),
    w: (ratio: number) => Math.round(width * ratio),
    size: (ratio: number) => Math.round(short * ratio),
  };
}

function textBoxHeight(fontSize: number, lineCount: number): number {
  return Math.round(fontSize * lineCount * 1.2);
}

function campaignPageBackground(src: string | null, fallback: string): string {
  return src ?? fallback;
}

/** Dark scrim over the page background — editable in Layers, deletable. */
function photoOverlay(width: number, height: number): PolotnoChild {
  return {
    id: uid('photo-overlay'),
    type: 'figure',
    subType: 'rect',
    name: 'Photo overlay',
    x: 0,
    y: 0,
    width,
    height,
    fill: 'rgba(15, 23, 42, 0.42)',
    opacity: 1,
    locked: false,
    selectable: true,
  };
}

function headlineText(
  text: string,
  layout: CampaignLayout,
  topRatio: number,
  fontSizeRatio: number,
  fill: string,
  stroke: string,
  strokeWidth = 3
): PolotnoChild {
  const fontSize = layout.font(fontSizeRatio);
  const lineCount = Math.max(1, text.split('\n').length);
  return {
    id: uid('text'),
    type: 'text',
    text,
    x: layout.pad,
    y: layout.y(topRatio),
    width: layout.width - layout.pad * 2,
    height: textBoxHeight(fontSize, lineCount),
    fontSize,
    fill,
    stroke,
    strokeWidth,
    fontWeight: 'bold',
    align: 'center',
  };
}

function pill(
  text: string,
  layout: CampaignLayout,
  leftRatio: number,
  topRatio: number,
  widthRatio: number,
  heightRatio: number,
  fill: string
): PolotnoChild[] {
  const pillW = layout.w(widthRatio);
  const pillH = layout.size(heightRatio);
  const x = layout.w(leftRatio);
  const y = layout.y(topRatio);
  const fontSize = Math.round(pillH * 0.42);
  return [
    {
      id: uid('pill-bg'),
      type: 'figure',
      subType: 'rect',
      x,
      y,
      width: pillW,
      height: pillH,
      fill,
      cornerRadius: pillH / 2,
    },
    {
      id: uid('pill-text'),
      type: 'text',
      text,
      x,
      y: y + Math.round(pillH / 2 - fontSize / 2),
      width: pillW,
      height: textBoxHeight(fontSize, 1),
      fontSize,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center',
    },
  ];
}

function slotCard(
  dateNum: string,
  dayName: string,
  x: number,
  y: number,
  size: number
): PolotnoChild[] {
  const dateSize = Math.round(size * 0.34);
  const daySize = Math.round(size * 0.11);
  return [
    {
      id: uid('slot-card'),
      type: 'figure',
      subType: 'rect',
      x,
      y,
      width: size,
      height: size,
      fill: '#ffffff',
      cornerRadius: 20,
    },
    {
      id: uid('slot-date'),
      type: 'text',
      text: dateNum,
      x,
      y: y + Math.round(size * 0.22),
      width: size,
      height: textBoxHeight(dateSize, 1),
      fontSize: dateSize,
      fill: '#7c4a2d',
      fontWeight: 'bold',
      align: 'center',
    },
    {
      id: uid('slot-day'),
      type: 'text',
      text: dayName,
      x,
      y: y + Math.round(size * 0.62),
      width: size,
      height: textBoxHeight(daySize, 1),
      fontSize: daySize,
      fill: '#7c4a2d',
      fontWeight: 'bold',
      align: 'center',
    },
  ];
}

function footerBrand(binding: DesignBinding, layout: CampaignLayout): PolotnoChild {
  const fontSize = layout.font(0.045);
  const footerTop = layout.isPortrait ? 0.9 : 0.88;
  return {
    id: uid('brand'),
    type: 'text',
    text: binding.propertyName.toUpperCase(),
    x: layout.pad,
    y: layout.y(footerTop),
    width: layout.width - layout.pad * 2,
    height: textBoxHeight(fontSize, 1),
    fontSize,
    fill: CREAM,
    stroke: BROWN,
    strokeWidth: 2,
    fontWeight: 'bold',
    align: 'center',
  };
}

function promoVerticalRatios(layout: CampaignLayout) {
  if (layout.isPortrait) {
    return {
      title: 0.12,
      upto: 0.24,
      amount: 0.3,
      pill: 0.46,
      cta: 0.54,
      footer: 0.9,
    };
  }
  return {
    title: 0.08,
    upto: 0.22,
    amount: 0.28,
    pill: 0.52,
    cta: 0.62,
    footer: 0.88,
  };
}

function buildPromoAmount(
  binding: DesignBinding,
  layout: CampaignLayout,
  opts: { title: string; amount: string; pill: string; cta: string }
): PolotnoChild[] {
  const v = promoVerticalRatios(layout);
  return [
    headlineText(opts.title, layout, v.title, 0.07, ORANGE, '#ffffff'),
    headlineText('UP TO', layout, v.upto, 0.05, CREAM, BROWN, 2),
    headlineText(opts.amount, layout, v.amount, 0.14, CREAM, BROWN, 4),
    ...pill(opts.pill, layout, 0.18, v.pill, 0.64, 0.07, ORANGE),
    headlineText(opts.cta, layout, v.cta, 0.035, CREAM, BROWN, 2),
    footerBrand(binding, layout),
  ];
}

function buildPromoPerk(
  binding: DesignBinding,
  layout: CampaignLayout,
  opts: { title: string; perk: string; pill: string }
): PolotnoChild[] {
  const titleTop = layout.isPortrait ? 0.14 : 0.1;
  const perkTop = layout.isPortrait ? 0.32 : 0.28;
  const pillTop = layout.isPortrait ? 0.46 : 0.48;
  return [
    headlineText(opts.title, layout, titleTop, 0.065, ORANGE, '#ffffff'),
    headlineText(opts.perk, layout, perkTop, 0.11, CREAM, BROWN, 3),
    ...pill(opts.pill, layout, 0.15, pillTop, 0.7, 0.07, GREEN),
    footerBrand(binding, layout),
  ];
}

function buildSlots(
  binding: DesignBinding,
  layout: CampaignLayout,
  slotCount: 1 | 3 | 5
): PolotnoChild[] {
  const headline = slotCount === 1 ? 'LAST SLOT' : `LAST ${slotCount} SLOTS`;
  const slots = binding.openSlots.slice(0, slotCount);
  const cardSize =
    slotCount === 1 ? layout.size(0.28) : slotCount === 3 ? layout.size(0.2) : layout.size(0.16);
  const gap = slotCount === 5 ? 16 : 24;
  const totalWidth = slotCount * cardSize + (slotCount - 1) * gap;
  let left = (layout.width - totalWidth) / 2;
  const top = layout.y(
    slotCount === 1 ? (layout.isPortrait ? 0.4 : 0.38) : layout.isPortrait ? 0.36 : 0.34
  );

  const monthTop = layout.isPortrait ? 0.19 : 0.17;
  const headlineTop = layout.isPortrait ? 0.1 : 0.07;

  const children: PolotnoChild[] = [
    headlineText(headline, layout, headlineTop, 0.075, ORANGE, '#ffffff'),
    ...pill(
      `FOR ${binding.monthShort.toUpperCase()}`,
      layout,
      0.28,
      monthTop,
      0.44,
      0.055,
      '#2563eb'
    ),
  ];

  slots.forEach((slot) => {
    children.push(...slotCard(slot.dateNum, slot.dayName, left, top, cardSize));
    left += cardSize + gap;
  });

  children.push(
    headlineText('BOOK NOW', layout, layout.isPortrait ? 0.68 : 0.72, 0.038, CREAM, BROWN, 2),
    footerBrand(binding, layout)
  );
  return children;
}

function buildGiveaway(binding: DesignBinding, layout: CampaignLayout): PolotnoChild[] {
  const bannerH = layout.size(0.12);
  const fontSize = layout.font(0.038);
  const prizeTop = layout.isPortrait ? 0.24 : 0.2;
  const rulesTop = layout.isPortrait ? 0.42 : 0.38;
  return [
    headlineText(
      `${binding.monthShort.toUpperCase()} GIVEAWAY`,
      layout,
      layout.isPortrait ? 0.1 : 0.06,
      0.07,
      ORANGE,
      '#ffffff'
    ),
    {
      id: uid('prize-bg'),
      type: 'figure',
      subType: 'rect',
      x: layout.w(0.08),
      y: layout.y(prizeTop),
      width: layout.w(0.84),
      height: bannerH,
      fill: RED,
      cornerRadius: 8,
    },
    {
      id: uid('prize-text'),
      type: 'text',
      text: 'FREE 2D1N STAYCATION\nWITH POOL ACCESS',
      x: layout.w(0.1),
      y: layout.y(prizeTop) + Math.round(bannerH / 2 - fontSize),
      width: layout.w(0.8),
      height: textBoxHeight(fontSize, 2),
      fontSize,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center',
    },
    {
      id: uid('rules'),
      type: 'text',
      text: '1. Like and follow our page.\n2. Tag friends in the comments.\n3. Share this post publicly.',
      x: layout.w(0.1),
      y: layout.y(rulesTop),
      width: layout.w(0.8),
      height: textBoxHeight(layout.font(0.032), 3),
      fontSize: layout.font(0.032),
      fill: BROWN,
      align: 'left',
    },
    footerBrand(binding, layout),
  ];
}

function buildFullyBooked(binding: DesignBinding, layout: CampaignLayout): PolotnoChild[] {
  const headlineTop = layout.isPortrait ? 0.32 : 0.28;
  const pillTop = layout.isPortrait ? 0.46 : 0.44;
  const subTop = layout.isPortrait ? 0.58 : 0.55;
  return [
    headlineText('FULLY BOOKED', layout, headlineTop, 0.1, CREAM, BROWN, 4),
    ...pill(
      `FOR ${binding.monthShort.toUpperCase()}`,
      layout,
      0.22,
      pillTop,
      0.56,
      0.07,
      '#64748b'
    ),
    headlineText('Watch for next month openings', layout, subTop, 0.04, CREAM, BROWN, 2),
    footerBrand(binding, layout),
  ];
}

const BUILDERS: Record<string, (binding: DesignBinding, layout: CampaignLayout) => PolotnoChild[]> =
  {
    'promo-500-off': (b, layout) =>
      buildPromoAmount(b, layout, {
        title: 'RAINY DAY PROMO',
        amount: '₱500 OFF',
        pill: 'FOR WEEKDAY BOOKINGS',
        cta: 'BOOK NOW AND ENJOY OUR RAINY SEASON PROMOS',
      }),
    'promo-300-off': (b, layout) =>
      buildPromoAmount(b, layout, {
        title: 'WEEKDAY PROMO',
        amount: '₱300 OFF',
        pill: 'MON–THU STAYS',
        cta: 'Message us to reserve your dates',
      }),
    'promo-10-off': (b, layout) =>
      buildPromoAmount(b, layout, {
        title: 'BER MONTHS PROMO',
        amount: '10% OFF',
        pill: 'LIMITED TIME',
        cta: 'Book direct for the best rate',
      }),
    'promo-free-breakfast': (b, layout) =>
      buildPromoPerk(b, layout, {
        title: 'STAY PROMO',
        perk: 'FREE BREAKFAST',
        pill: 'SELECT DATES',
      }),
    'promo-free-parking': (b, layout) =>
      buildPromoPerk(b, layout, {
        title: 'PARKING PERK',
        perk: 'FREE PARKING',
        pill: 'THIS MONTH',
      }),
    'slots-1': (b, layout) => buildSlots(b, layout, 1),
    'slots-3': (b, layout) => buildSlots(b, layout, 3),
    'slots-5': (b, layout) => buildSlots(b, layout, 5),
    giveaway: buildGiveaway,
    'fully-booked': buildFullyBooked,
  };

export type PolotnoDesignDocument = {
  width: number;
  height: number;
  schemaVersion: number;
  fonts: unknown[];
  pages: Array<{
    id: string;
    background: string;
    children: PolotnoChild[];
  }>;
  custom?: Record<string, unknown>;
};

export function buildPolotnoCampaignDocument(
  templateId: string,
  binding: DesignBinding
): PolotnoDesignDocument | null {
  const template = getCampaignTemplate(templateId);
  if (!template) return null;

  const baseId = campaignTemplateBaseId(templateId);
  const builder = BUILDERS[baseId];
  if (!builder) return null;

  const { width, height } = DESIGN_FORMAT_DIMENSIONS[template.format];
  const layout = createCampaignLayout(width, height);
  resetIds();

  return {
    width,
    height,
    schemaVersion: 2,
    fonts: [],
    custom: { templateId, campaignBaseId: baseId },
    pages: [
      {
        id: uid('page'),
        background: campaignPageBackground(binding.propertyPhoto, '#78716c'),
        children: [photoOverlay(width, height), ...builder(binding, layout)],
      },
    ],
  };
}

export function formatDimensions(format: DesignTemplateFormat) {
  return DESIGN_FORMAT_DIMENSIONS[format];
}
