/**
 * Structured AI tokens for Marketing Content Studio templates (Gemini / Groq).
 * Calendar MVP: returns a single calendar token payload (not full CalendarStyles).
 */

import {
  extractGeminiText,
  extractGeminiUsage,
  getGeminiApiKeys,
  getGroqApiKey,
  nextGeminiKeyStartIndex,
  shouldTryNextProvider,
} from './aiGeminiKeys.ts';
import { geminiGenerateContentUrl, getModelConfig } from './aiModelRouter.ts';
import { assertOrgAndPropertyAiQuota, recordAiUsage } from './aiUsageService.ts';
import {
  buildCacheInputs,
  computePromptFingerprint,
  getCachedAiResponse,
  setCachedAiResponse,
} from './aiQuotaCache.ts';

const FEATURE = 'marketing_template' as const;
const CONFIG = getModelConfig(FEATURE);
const GEMINI_MODEL = CONFIG.model;
const GEMINI_URL = geminiGenerateContentUrl(GEMINI_MODEL);
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CALENDAR_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    layoutArchetype: { type: 'STRING' },
    palette: {
      type: 'OBJECT',
      properties: {
        primary: { type: 'STRING' },
        secondary: { type: 'STRING' },
        accent: { type: 'STRING' },
      },
      required: ['primary', 'secondary', 'accent'],
    },
    fontPairing: { type: 'STRING' },
    backgroundMood: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    label: { type: 'STRING' },
  },
  required: ['layoutArchetype', 'palette', 'fontPairing', 'backgroundMood', 'subtitle', 'label'],
} as const;

const VIDEO_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    category: { type: 'STRING' },
    scenes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING' },
          durationSec: { type: 'NUMBER' },
          transition: { type: 'STRING' },
          motion: { type: 'STRING' },
        },
        required: ['kind', 'durationSec', 'transition', 'motion'],
      },
    },
    fontPairing: { type: 'STRING' },
    copy: {
      type: 'OBJECT',
      properties: {
        headline: { type: 'STRING' },
        subheadline: { type: 'STRING' },
        promoLine: { type: 'STRING' },
        slotLabels: { type: 'ARRAY', items: { type: 'STRING' } },
        ctaLine: { type: 'STRING' },
        rulesLine: { type: 'STRING' },
      },
      required: ['headline', 'subheadline', 'promoLine', 'slotLabels', 'ctaLine', 'rulesLine'],
    },
    label: { type: 'STRING' },
  },
  required: ['category', 'scenes', 'fontPairing', 'copy', 'label'],
} as const;

const DESIGN_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    layoutArchetype: { type: 'STRING' },
    palette: {
      type: 'OBJECT',
      properties: {
        primary: { type: 'STRING' },
        secondary: { type: 'STRING' },
        accent: { type: 'STRING' },
      },
      required: ['primary', 'secondary', 'accent'],
    },
    fontPairing: { type: 'STRING' },
    backgroundMood: { type: 'STRING' },
    category: { type: 'STRING' },
    copy: {
      type: 'OBJECT',
      properties: {
        eyebrow: { type: 'STRING' },
        headline: { type: 'STRING' },
        subheadline: { type: 'STRING' },
        detail: { type: 'STRING' },
        cta: { type: 'STRING' },
      },
      required: ['eyebrow', 'headline', 'subheadline', 'detail', 'cta'],
    },
    label: { type: 'STRING' },
  },
  required: [
    'layoutArchetype',
    'palette',
    'fontPairing',
    'backgroundMood',
    'category',
    'copy',
    'label',
  ],
} as const;

function parseAiJsonPayload(text: string): unknown {
  const attempts: string[] = [];
  const trimmed = text.trim();
  if (trimmed) attempts.push(trimmed);

  const fullFence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  if (fullFence?.[1]?.trim()) attempts.push(fullFence[1].trim());

  const embeddedFence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (embeddedFence?.[1]?.trim()) attempts.push(embeddedFence[1].trim());

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) attempts.push(jsonMatch[0]);

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try next candidate */
    }
  }

  throw new Error('AI generation returned unreadable JSON');
}

function isValidAiJsonText(text: string): boolean {
  try {
    parseAiJsonPayload(text);
    return true;
  } catch {
    return false;
  }
}

export type MarketingTemplateContentType = 'calendar' | 'design' | 'video';

export type CalendarLayoutArchetype =
  | 'bubble'
  | 'widget'
  | 'type-forward'
  | 'geo-pattern'
  | 'botanical'
  | 'photo-wash'
  | 'dusk-gradient';

export type CalendarFontPairing =
  'soft-sans' | 'editorial-serif' | 'playful-rounded' | 'modern-clean';

export type CalendarBackgroundMood =
  'solid-cream' | 'soft-gradient' | 'pattern-dots' | 'photo-wash';

/** Schema-constrained tokens; client compiles into CalendarStyles. */
export type CalendarTemplateTokens = {
  layoutArchetype: CalendarLayoutArchetype;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fontPairing: CalendarFontPairing;
  backgroundMood: CalendarBackgroundMood;
  subtitle: string;
  label: string;
};

export type DesignLayoutArchetype =
  | 'hero-photo'
  | 'split-panel'
  | 'centered-card'
  | 'editorial-minimal'
  | 'gradient-frame'
  | 'photo-bottom'
  | 'left-stack';

export type DesignFontPairing =
  'serif-editorial' | 'clean-sans' | 'modern-sleek' | 'rounded-friendly';

export type DesignBackgroundMood = 'photo' | 'solid' | 'gradient' | 'color-wash';

export type DesignCampaignCategory = 'promo' | 'slots' | 'giveaway' | 'fully-booked' | 'custom';

export type DesignTemplateTokens = {
  layoutArchetype: DesignLayoutArchetype;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fontPairing: DesignFontPairing;
  backgroundMood: DesignBackgroundMood;
  category: DesignCampaignCategory;
  copy: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    detail: string;
    cta: string;
  };
  label: string;
};

export type VideoCategory =
  | 'soft-stay'
  | 'flash-deal'
  | 'last-openings'
  | 'social-proof'
  | 'fully-booked'
  | 'seasonal'
  | 'custom';

export type VideoSceneKind = 'photo' | 'promo' | 'slots' | 'cta';

export type VideoTransition =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-up'
  | 'wipe'
  | 'dissolve'
  | 'flip'
  | 'clock-wipe'
  | 'zoom-in-out'
  | 'push-cut';

export type VideoMotionOverride =
  | 'slow-zoom-in'
  | 'punch-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'drift-up'
  | 'diagonal-drift'
  | 'hold';

export type VideoFontPairingId =
  'editorial-serif' | 'cinematic-serif' | 'modern-sans' | 'warm-serif';

export type VideoSceneToken = {
  kind: VideoSceneKind;
  durationSec: number;
  transition: VideoTransition;
  motion: VideoMotionOverride;
};

/** Schema-constrained tokens; client compiles into a VideoProject (3 formats, no extra AI calls). */
export type VideoTemplateTokens = {
  category: VideoCategory;
  scenes: VideoSceneToken[];
  fontPairing: VideoFontPairingId;
  copy: {
    headline: string;
    subheadline: string;
    promoLine: string;
    slotLabels: string[];
    ctaLine: string;
    rulesLine: string;
  };
  label: string;
};

export type AnyTemplateTokens = CalendarTemplateTokens | DesignTemplateTokens | VideoTemplateTokens;

export type GenerateMarketingTemplateInput = {
  organizationId: string;
  propertyId: string;
  contentType: MarketingTemplateContentType;
  prompt: string;
  propertyName: string;
  amenitiesText?: string;
  availabilityText?: string;
  hasPropertyPhoto?: boolean;
  content?: string;
  includeOrgLogo?: boolean;
  includePropertyName?: boolean;
  includeCta?: boolean;
  preferences?: {
    layoutArchetype?: string;
    fontPairing?: string;
    backgroundMood?: string;
    category?: string;
  };
};

const CALENDAR_ARCHETYPES: CalendarLayoutArchetype[] = [
  'bubble',
  'widget',
  'type-forward',
  'geo-pattern',
  'botanical',
  'photo-wash',
  'dusk-gradient',
];

const CALENDAR_FONTS: CalendarFontPairing[] = [
  'soft-sans',
  'editorial-serif',
  'playful-rounded',
  'modern-clean',
];

const CALENDAR_BACKGROUNDS: CalendarBackgroundMood[] = [
  'solid-cream',
  'soft-gradient',
  'pattern-dots',
  'photo-wash',
];

const DESIGN_ARCHETYPES: DesignLayoutArchetype[] = [
  'hero-photo',
  'split-panel',
  'centered-card',
  'editorial-minimal',
  'gradient-frame',
  'photo-bottom',
  'left-stack',
];

const DESIGN_FONTS: DesignFontPairing[] = [
  'serif-editorial',
  'clean-sans',
  'modern-sleek',
  'rounded-friendly',
];

const DESIGN_BACKGROUNDS: DesignBackgroundMood[] = ['photo', 'solid', 'gradient', 'color-wash'];

const DESIGN_CATEGORIES: DesignCampaignCategory[] = [
  'promo',
  'slots',
  'giveaway',
  'fully-booked',
  'custom',
];

const VIDEO_CATEGORIES: VideoCategory[] = [
  'soft-stay',
  'flash-deal',
  'last-openings',
  'social-proof',
  'fully-booked',
  'seasonal',
  'custom',
];

const VIDEO_SCENE_KINDS: VideoSceneKind[] = ['photo', 'promo', 'slots', 'cta'];

const VIDEO_TRANSITIONS: VideoTransition[] = [
  'none',
  'fade',
  'slide-left',
  'slide-up',
  'wipe',
  'dissolve',
  'flip',
  'clock-wipe',
  'zoom-in-out',
  'push-cut',
];

const VIDEO_MOTIONS: VideoMotionOverride[] = [
  'slow-zoom-in',
  'punch-in',
  'zoom-out',
  'pan-left',
  'pan-right',
  'drift-up',
  'diagonal-drift',
  'hold',
];

const VIDEO_FONT_PAIRINGS: VideoFontPairingId[] = [
  'editorial-serif',
  'cinematic-serif',
  'modern-sans',
  'warm-serif',
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function clampLabel(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, 40);
  return cleaned || fallback;
}

function clampSubtitle(value: unknown): string {
  if (typeof value !== 'string') return 'Available dates';
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, 48);
  return cleaned || 'Available dates';
}

function clampText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return cleaned || fallback;
}

export function parseCalendarTemplateTokens(raw: unknown): CalendarTemplateTokens {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nested =
    obj.tokens && typeof obj.tokens === 'object'
      ? (obj.tokens as Record<string, unknown>)
      : obj.calendar && typeof obj.calendar === 'object'
        ? (obj.calendar as Record<string, unknown>)
        : obj;
  const paletteRaw =
    nested.palette && typeof nested.palette === 'object'
      ? (nested.palette as Record<string, unknown>)
      : {};

  return {
    layoutArchetype: pickEnum(nested.layoutArchetype, CALENDAR_ARCHETYPES, 'bubble'),
    palette: {
      primary: normalizeHex(paletteRaw.primary, '#a48ee0'),
      secondary: normalizeHex(paletteRaw.secondary, '#f3edfd'),
      accent: normalizeHex(paletteRaw.accent, '#ff8fa8'),
    },
    fontPairing: pickEnum(nested.fontPairing, CALENDAR_FONTS, 'soft-sans'),
    backgroundMood: pickEnum(nested.backgroundMood, CALENDAR_BACKGROUNDS, 'solid-cream'),
    subtitle: clampSubtitle(nested.subtitle),
    label: clampLabel(nested.label, 'AI calendar'),
  };
}

export function parseDesignTemplateTokens(raw: unknown): DesignTemplateTokens {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nested =
    obj.tokens && typeof obj.tokens === 'object'
      ? (obj.tokens as Record<string, unknown>)
      : obj.design && typeof obj.design === 'object'
        ? (obj.design as Record<string, unknown>)
        : obj;
  const paletteRaw =
    nested.palette && typeof nested.palette === 'object'
      ? (nested.palette as Record<string, unknown>)
      : {};
  const copyRaw =
    nested.copy && typeof nested.copy === 'object' ? (nested.copy as Record<string, unknown>) : {};

  return {
    layoutArchetype: pickEnum(nested.layoutArchetype, DESIGN_ARCHETYPES, 'hero-photo'),
    palette: {
      primary: normalizeHex(paletteRaw.primary, '#24a88e'),
      secondary: normalizeHex(paletteRaw.secondary, '#fff7eb'),
      accent: normalizeHex(paletteRaw.accent, '#e8752a'),
    },
    fontPairing: pickEnum(nested.fontPairing, DESIGN_FONTS, 'serif-editorial'),
    backgroundMood: pickEnum(nested.backgroundMood, DESIGN_BACKGROUNDS, 'gradient'),
    category: pickEnum(nested.category, DESIGN_CATEGORIES, 'promo'),
    copy: {
      eyebrow: clampText(copyRaw.eyebrow, 'Special Offer', 40),
      headline: clampText(copyRaw.headline, 'Save on your stay', 80),
      subheadline: clampText(copyRaw.subheadline, 'Book direct for the best rate.', 80),
      detail: clampText(copyRaw.detail, 'Limited dates available this month.', 120),
      cta: clampText(copyRaw.cta, 'Book now', 30),
    },
    label: clampLabel(nested.label, 'AI design'),
  };
}

function clampDuration(value: unknown, fallback = 3): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(12, Math.max(1, Math.round(num * 10) / 10));
}

function clampStringArray(value: unknown, max: number, itemMax: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim().slice(0, itemMax))
    .filter(Boolean)
    .slice(0, max);
}

const VIDEO_SCENE_COUNT_MIN = 3;
const VIDEO_SCENE_COUNT_MAX = 5;

export function parseVideoTemplateTokens(raw: unknown): VideoTemplateTokens {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nested =
    obj.tokens && typeof obj.tokens === 'object'
      ? (obj.tokens as Record<string, unknown>)
      : obj.video && typeof obj.video === 'object'
        ? (obj.video as Record<string, unknown>)
        : obj;
  const copyRaw =
    nested.copy && typeof nested.copy === 'object' ? (nested.copy as Record<string, unknown>) : {};

  const scenesRaw = Array.isArray(nested.scenes) ? nested.scenes : [];
  const scenes: VideoSceneToken[] = scenesRaw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .slice(0, VIDEO_SCENE_COUNT_MAX)
    .map((item) => ({
      kind: pickEnum(item.kind, VIDEO_SCENE_KINDS, 'photo'),
      durationSec: clampDuration(item.durationSec),
      transition: pickEnum(item.transition, VIDEO_TRANSITIONS, 'fade'),
      motion: pickEnum(item.motion, VIDEO_MOTIONS, 'slow-zoom-in'),
    }));

  while (scenes.length < VIDEO_SCENE_COUNT_MIN) {
    scenes.push({ kind: 'photo', durationSec: 3, transition: 'fade', motion: 'slow-zoom-in' });
  }

  return {
    category: pickEnum(nested.category, VIDEO_CATEGORIES, 'soft-stay'),
    scenes,
    fontPairing: pickEnum(nested.fontPairing, VIDEO_FONT_PAIRINGS, 'editorial-serif'),
    copy: {
      headline: clampText(copyRaw.headline, 'A STAY WORTH REMEMBERING', 40),
      subheadline: clampText(copyRaw.subheadline, '', 46),
      promoLine: clampText(copyRaw.promoLine, '', 46),
      slotLabels: clampStringArray(copyRaw.slotLabels, 3, 24),
      ctaLine: clampText(copyRaw.ctaLine, 'Book now', 24),
      rulesLine: clampText(copyRaw.rulesLine, '', 32),
    },
    label: clampLabel(nested.label, 'AI video'),
  };
}

const VIDEO_CATEGORY_DEFAULT_CONTENT: Record<VideoCategory, string> = {
  'soft-stay': 'a calm, editorial welcome moment that sells the feeling of staying here',
  'flash-deal': 'a limited-time discount with urgency to book direct',
  'last-openings': 'the last remaining open dates this month, encouraging a quick booking',
  'social-proof': 'a warm guest-love moment that builds trust in the property',
  'fully-booked': 'a fully booked announcement that invites guests to join a waitlist',
  seasonal: 'a seasonal moment tied to the time of year that invites a booking',
  custom: '',
};

function videoSystemPrompt(): string {
  return [
    'You direct short-form vacation-rental promo video storyboards (Instagram Reels/Stories, 9:16 and 1:1) for a Remotion-based video editor.',
    'The editor renders a fixed sequence of "scenes" — you choose how many (3 to 5) and describe each one. Every scene shares the same background (a property photo/video) with camera motion, plus optional text overlays layered on top.',
    'Return ONLY JSON matching this schema (no markdown):',
    '{',
    '  "category": "soft-stay|flash-deal|last-openings|social-proof|fully-booked|seasonal|custom",',
    '  "scenes": [',
    '    { "kind": "photo|promo|slots|cta", "durationSec": 2-6, "transition": "none|fade|slide-left|slide-up|wipe|dissolve|flip|clock-wipe|zoom-in-out|push-cut", "motion": "slow-zoom-in|punch-in|zoom-out|pan-left|pan-right|drift-up|diagonal-drift|hold" }',
    '  ],',
    '  "fontPairing": "editorial-serif|cinematic-serif|modern-sans|warm-serif",',
    '  "copy": {',
    '    "headline": "short punchy hook under 40 chars, shown on the first scene",',
    '    "subheadline": "supporting line under 46 chars (optional, can be empty)",',
    '    "promoLine": "offer/detail line under 46 chars (optional, can be empty)",',
    '    "slotLabels": ["up to 3 short date labels under 24 chars — ONLY if a scene kind is slots, else empty array"],',
    '    "ctaLine": "call-to-action under 24 chars, shown on the final scene",',
    '    "rulesLine": "short footer line under 32 chars, e.g. the property name (optional, can be empty)"',
    '  },',
    '  "label": "short template name under 40 chars"',
    '}',
    'Rules:',
    '- Think like a professional short-form video editor: hook attention in the first scene, build with 1-3 supporting scenes (b-roll and/or an offer/date reveal), and always land on a clear final scene.',
    '- The LAST scene in your array is always treated as the closing/CTA beat by the renderer — its kind does not need to be "cta" but it should read as the ending.',
    '- Use "slots" kind only when the video is about specific open dates (last-openings category) — otherwise never use "slots".',
    '- Use category "custom" only when the host explicitly picked Custom and wrote their own Content — follow that Content closely instead of assuming a category mood.',
    '- Target a TOTAL video length of 10-15 seconds (the sum of every durationSec) by default — this is a real short-form ad, not a 3-second teaser. Use 3-5 scenes, each roughly 2-5 seconds.',
    '- Every line of copy is on-screen for the whole scene at a large size with no manual line breaks — keep every field well under its character limit so it reads as one short punchy line, not a paragraph.',
    '- Vary transitions and motion across scenes for a dynamic, professionally-edited feel — do not repeat the same transition or motion on every scene.',
    '- Editorial, elegant, Instagrammable hospitality tone — avoid neon, chaotic cuts, or gimmicky effects.',
    '- headline is the hook — make it punchy and specific to the prompt, not generic.',
    '- Do not invent fields outside the schema.',
  ].join('\n');
}

function buildVideoUserPrompt(input: GenerateMarketingTemplateInput): string {
  const prefs = input.preferences ?? {};
  const category = prefs.category as VideoCategory | undefined;
  const categoryDefault = category ? VIDEO_CATEGORY_DEFAULT_CONTENT[category] : undefined;
  const lines = [
    `Property: ${input.propertyName}`,
    `Content type: ${input.contentType}`,
    `Category: ${prefs.category || 'soft-stay'}`,
    `Host prompt: ${input.prompt || '(no prompt — pick a tasteful editorial hospitality promo video)'}`,
  ];
  if (input.content) {
    lines.push(`Content: ${input.content}`);
  } else if (categoryDefault) {
    lines.push(`Content: ${categoryDefault}`);
  }
  if (input.amenitiesText) lines.push(`Amenities: ${input.amenitiesText}`);
  if (input.availabilityText) lines.push(`Availability: ${input.availabilityText}`);
  lines.push(
    input.hasPropertyPhoto
      ? 'Property photo/video: available for the background.'
      : 'Property photo/video: not available — copy should not assume a specific visual.'
  );
  if (input.includePropertyName === false) lines.push('Property name (rulesLine): do NOT include');
  if (input.includeCta === false) lines.push('Call-to-action: do NOT include');
  if (prefs.layoutArchetype && prefs.layoutArchetype !== 'auto') {
    lines.push(
      `Preferred total video duration: about ${prefs.layoutArchetype} seconds — pick a scene count and pacing (durationSec per scene) that adds up close to this.`
    );
  }
  if (prefs.fontPairing) lines.push(`Preferred fontPairing: ${prefs.fontPairing}`);
  if (prefs.backgroundMood === 'calm') lines.push('Preferred motion mood: calm, slow Ken Burns');
  if (prefs.backgroundMood === 'energetic')
    lines.push('Preferred motion mood: energetic, punchy cuts');
  if (prefs.backgroundMood === 'cinematic')
    lines.push('Preferred motion mood: cinematic pans and drifts');
  lines.push('Emit one video storyboard token object as JSON.');
  return lines.join('\n');
}

function calendarSystemPrompt(): string {
  return [
    'You design vacation-rental availability calendar templates for Instagram/Facebook Stories & feed.',
    'Return ONLY JSON matching this schema (no markdown):',
    '{',
    '  "layoutArchetype": "bubble|widget|type-forward|geo-pattern|botanical|photo-wash|dusk-gradient",',
    '  "palette": { "primary": "#rrggbb", "secondary": "#rrggbb", "accent": "#rrggbb" },',
    '  "fontPairing": "soft-sans|editorial-serif|playful-rounded|modern-clean",',
    '  "backgroundMood": "solid-cream|soft-gradient|pattern-dots|photo-wash",',
    '  "subtitle": "short calendar subtitle under 48 chars",',
    '  "label": "short template name under 40 chars"',
    '}',
    'Rules:',
    '- Instagrammable soft-pastel hospitality look (lavender, mint, blush, butter, periwinkle) — elegant, not neon or corporate.',
    '- READABILITY IS NON-NEGOTIABLE: date numbers and labels must stay readable. Never pick near-white or ice-pale colors for primary/accent.',
    '- primary = mid-depth pastel fill for available days (saturated enough that dark ink can sit on it OR light ink on a deeper fill). Avoid #eaf4f4-style washed tints.',
    '- secondary = very light wash for the card background (near-white tint of primary, e.g. #f7f4ff).',
    '- accent = warmer/punchier today highlight, clearly distinct from primary (blush, peach, coral) — not the same hue family washed out.',
    '- Prefer secondary luminance very high; primary clearly deeper than secondary; accent saturated enough to pop as "today".',
    '- Use photo-wash backgroundMood only when a property photo is available or the prompt asks for photo.',
    '- label should be memorable and specific to the prompt vibe (not "AI calendar").',
    '- Do not invent layout fields outside the schema.',
  ].join('\n');
}

const DESIGN_CATEGORY_DEFAULT_CONTENT: Record<DesignCampaignCategory, string> = {
  promo: 'promotional offer with a discount or special deal',
  slots: 'last remaining availability alert with urgency',
  giveaway: 'giveaway or contest invitation',
  'fully-booked': 'fully booked announcement with waitlist invitation',
  custom: 'custom vacation-rental marketing message',
};

function designSystemPrompt(): string {
  return [
    'You design vacation-rental marketing graphics (Instagram/Facebook posts and stories) for a Polotno canvas editor.',
    'Return ONLY JSON matching this schema (no markdown):',
    '{',
    '      "layoutArchetype": "hero-photo|split-panel|centered-card|editorial-minimal|gradient-frame|photo-bottom|left-stack",',
    '  "palette": { "primary": "#rrggbb", "secondary": "#rrggbb", "accent": "#rrggbb" },',
    '  "fontPairing": "serif-editorial|clean-sans|modern-sleek|rounded-friendly",',
    '  "backgroundMood": "photo|solid|gradient|color-wash",',
    '  "category": "promo|slots|giveaway|fully-booked|custom",',
    '  "copy": {',
    '    "eyebrow": "short tracked uppercase label under 40 chars",',
    '    "headline": "main headline under 80 chars",',
    '    "subheadline": "one line under headline under 80 chars (optional, can be empty)",',
    '    "detail": "supporting detail under 120 chars",',
    '    "cta": "call-to-action under 30 chars"',
    '  },',
    '  "label": "short template name under 40 chars"',
    '}',
    'Rules:',
    '- The user picks a category and may provide a Content description. The generated copy MUST match the category and Content. Do not default to giveaway copy.',
    '- Be creative and instagrammable: use gradients, colored overlays, elegant frames, soft shapes, and beautiful typography. Avoid tacky stars, hexagons, diamonds, sunbursts, rotation, or 3D badges.',
    '- READABILITY IS NON-NEGOTIABLE: headline and body text must contrast strongly with the background. If the background is light, use dark ink. If the background is dark, use light or white text.',
    '- Palette must be warm, muted, hospitality-friendly (teal, terracotta, sand, blush, sage, mauve, olive, charcoal). Avoid neon, pure saturated primaries, or corporate blue-greys.',
    '- primary = dominant background or large fill.',
    '- secondary = very light surface/card color (near-white or pale tint).',
    '- accent = warm, punchier color for rules, frames, and CTA emphasis.',
    '- When a property photo is available, you MUST set backgroundMood to "photo" so the compiler can place it. When no property photo is available, never use "photo" — prefer "gradient" or "color-wash".',
    '- Category should match the prompt intent: promo for discounts, slots for limited openings, giveaway for contests, fully-booked for waitlist announcements, custom for anything else.',
    '- Copy should be concise, on-brand, and specific to the category and Content.',
    '- label should be memorable and specific to the prompt vibe (not "AI design").',
    '- Do not invent layout fields outside the schema.',
  ].join('\n');
}

function buildUserPrompt(input: GenerateMarketingTemplateInput): string {
  const lines = [
    `Property: ${input.propertyName}`,
    `Content type: ${input.contentType}`,
    `Host prompt: ${input.prompt || '(no prompt — pick a tasteful pastel availability calendar)'}`,
  ];
  if (input.amenitiesText) lines.push(`Amenities: ${input.amenitiesText}`);
  if (input.availabilityText) lines.push(`Availability: ${input.availabilityText}`);
  if (input.hasPropertyPhoto) lines.push('Property photo: available');
  const prefs = input.preferences ?? {};
  if (prefs.layoutArchetype) lines.push(`Preferred layoutArchetype: ${prefs.layoutArchetype}`);
  if (prefs.fontPairing) lines.push(`Preferred fontPairing: ${prefs.fontPairing}`);
  if (prefs.backgroundMood) lines.push(`Preferred backgroundMood: ${prefs.backgroundMood}`);
  lines.push(
    'Hard requirement: date numbers and labels must stay high-contrast and readable on every day cell.'
  );
  lines.push('Emit one calendar token object as JSON.');
  return lines.join('\n');
}

function buildDesignUserPrompt(input: GenerateMarketingTemplateInput): string {
  const prefs = input.preferences ?? {};
  const category = prefs.category as DesignCampaignCategory | undefined;
  const categoryDefault = category ? DESIGN_CATEGORY_DEFAULT_CONTENT[category] : undefined;
  const lines = [
    `Property: ${input.propertyName}`,
    `Content type: ${input.contentType}`,
    `Category: ${prefs.category || 'promo'}`,
    `Host prompt: ${input.prompt || '(no prompt — pick a tasteful editorial hospitality promo design)'}`,
  ];
  if (input.content) {
    lines.push(`Content: ${input.content}`);
  } else if (categoryDefault) {
    lines.push(`Content: ${categoryDefault}`);
  }
  if (input.amenitiesText) lines.push(`Amenities: ${input.amenitiesText}`);
  if (input.availabilityText) lines.push(`Availability: ${input.availabilityText}`);
  if (input.hasPropertyPhoto) {
    lines.push('Property photo: available — you MUST set backgroundMood to "photo".');
  } else {
    lines.push('Property photo: not available — do not use backgroundMood "photo".');
  }
  if (input.includeOrgLogo) lines.push('Org logo: include in design');
  if (input.includePropertyName === false) lines.push('Property name: do NOT include');
  if (input.includeCta === false) lines.push('Call-to-action: do NOT include');
  if (prefs.layoutArchetype) lines.push(`Preferred layoutArchetype: ${prefs.layoutArchetype}`);
  if (prefs.fontPairing) lines.push(`Preferred fontPairing: ${prefs.fontPairing}`);
  if (prefs.backgroundMood) lines.push(`Preferred backgroundMood: ${prefs.backgroundMood}`);
  if (prefs.category) lines.push(`Preferred category: ${prefs.category}`);
  lines.push(
    'Hard requirement: headline and CTA must stay high-contrast and readable on the chosen background.'
  );
  lines.push('Emit one design token object as JSON.');
  return lines.join('\n');
}

async function generateJsonText(
  systemPrompt: string,
  userPrompt: string,
  responseSchema: unknown,
  usage: { organizationId: string; propertyId: string },
  cacheKey: string
): Promise<string> {
  const cached = await getCachedAiResponse(cacheKey);
  if (cached && isValidAiJsonText(cached)) return cached;

  const keys = getGeminiApiKeys();
  let geminiSawKeys = keys.length > 0;
  let geminiQuotaHit = false;
  let geminiLastStatus: number | null = null;
  let geminiParseFailures = 0;

  const startIdx = nextGeminiKeyStartIndex(keys.length);
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = keys[(startIdx + attempt) % keys.length]!;
    try {
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: CONFIG.defaultMaxOutputTokens,
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            thinkingConfig: { thinkingBudget: CONFIG.thinkingBudget },
          },
        }),
      });
      geminiLastStatus = res.status;
      if (res.status === 429) {
        geminiQuotaHit = true;
        continue;
      }
      if (!res.ok) {
        if (shouldTryNextProvider(res.status)) continue;
        break;
      }
      const json = await res.json();
      const finishReason =
        (json as { candidates?: Array<{ finishReason?: string }> }).candidates?.[0]?.finishReason ??
        '';
      const text = extractGeminiText(json);
      if (text && finishReason !== 'MAX_TOKENS' && isValidAiJsonText(text)) {
        const tokenUsage = extractGeminiUsage(json);
        await recordAiUsage({
          organizationId: usage.organizationId,
          propertyId: usage.propertyId,
          feature: FEATURE,
          provider: 'gemini',
          model: GEMINI_MODEL,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
        });
        await setCachedAiResponse(cacheKey, text, CONFIG.cacheTtlSeconds);
        return text;
      }
      if (text) geminiParseFailures += 1;
    } catch {
      /* try next key */
    }
  }

  const groq = getGroqApiKey();
  let groqLastStatus: number | null = null;
  if (groq) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groq}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.85,
          max_tokens: CONFIG.defaultMaxOutputTokens,
          response_format: { type: 'json_object' },
        }),
      });
      groqLastStatus = res.status;
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text && isValidAiJsonText(text)) {
          await recordAiUsage({
            organizationId: usage.organizationId,
            propertyId: usage.propertyId,
            feature: FEATURE,
            provider: 'groq',
            model: GROQ_MODEL,
            inputTokens: Number(json.usage?.prompt_tokens ?? 0),
            outputTokens: Number(json.usage?.completion_tokens ?? 0),
          });
          await setCachedAiResponse(cacheKey, text, CONFIG.cacheTtlSeconds);
          return text;
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (!geminiSawKeys && !groq) {
    throw new Error('AI generation unavailable — configure GEMINI_API_KEYS or GROQ_API_KEY');
  }
  if (geminiParseFailures > 0) {
    throw new Error('AI generation returned unreadable JSON');
  }
  if (geminiQuotaHit) {
    throw new Error(
      'AI generation unavailable — Gemini quota exceeded on all configured keys' +
        (groqLastStatus ? ` (Groq fallback HTTP ${groqLastStatus})` : groq ? '' : '')
    );
  }
  if (geminiLastStatus || groqLastStatus) {
    throw new Error(
      `AI generation unavailable — Gemini HTTP ${geminiLastStatus ?? 'n/a'}` +
        (groq ? `, Groq HTTP ${groqLastStatus ?? 'n/a'}` : '')
    );
  }
  throw new Error('AI generation unavailable — providers returned empty responses');
}

export async function generateMarketingTemplateTokens(
  input: GenerateMarketingTemplateInput
): Promise<
  | { contentType: 'calendar'; tokens: CalendarTemplateTokens }
  | { contentType: 'design'; tokens: DesignTemplateTokens }
  | { contentType: 'video'; tokens: VideoTemplateTokens }
> {
  if (
    input.contentType !== 'calendar' &&
    input.contentType !== 'design' &&
    input.contentType !== 'video'
  ) {
    throw new Error(
      `contentType "${input.contentType}" is not supported yet — use calendar, design, or video`
    );
  }

  await assertOrgAndPropertyAiQuota(input.organizationId, input.propertyId, FEATURE);

  if (input.contentType === 'calendar') {
    const system = calendarSystemPrompt();
    const user = buildUserPrompt(input);
    const cacheKey = computePromptFingerprint(buildCacheInputs(FEATURE, system, user));
    const rawText = await generateJsonText(
      system,
      user,
      CALENDAR_RESPONSE_SCHEMA,
      {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
      },
      cacheKey
    );
    const parsed = parseAiJsonPayload(rawText);
    return {
      contentType: 'calendar',
      tokens: parseCalendarTemplateTokens(parsed),
    };
  }

  if (input.contentType === 'video') {
    const system = videoSystemPrompt();
    const user = buildVideoUserPrompt(input);
    const cacheKey = computePromptFingerprint(buildCacheInputs(FEATURE, system, user));
    const rawText = await generateJsonText(
      system,
      user,
      VIDEO_RESPONSE_SCHEMA,
      {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
      },
      cacheKey
    );
    const parsed = parseAiJsonPayload(rawText);
    return {
      contentType: 'video',
      tokens: parseVideoTemplateTokens(parsed),
    };
  }

  const designSystem = designSystemPrompt();
  const designUser = buildDesignUserPrompt(input);
  const designCacheKey = computePromptFingerprint(
    buildCacheInputs(FEATURE, designSystem, designUser)
  );
  const rawText = await generateJsonText(
    designSystem,
    designUser,
    DESIGN_RESPONSE_SCHEMA,
    {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
    },
    designCacheKey
  );
  const parsed = parseAiJsonPayload(rawText);

  return {
    contentType: 'design',
    tokens: parseDesignTemplateTokens(parsed),
  };
}
