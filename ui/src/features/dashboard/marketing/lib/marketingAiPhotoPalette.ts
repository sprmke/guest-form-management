import type { ShowcaseMediaPalette } from '@/features/guest/marketing/showcase/lib/showcaseMediaPalette';
import { resolveOrgBrandHex } from '@/lib/theme/brandColor';

/** First Look template id per content type — property colors (photos, else brand). */
export const MARKETING_AI_PHOTO_PALETTE_SUGGESTION_IDS = {
  calendar: 'blush-petal',
  design: 'quiet-coast',
  video: 'slow-pans-soft-light',
} as const;

export type MarketingAiTokenPalette = {
  primary: string;
  secondary: string;
  accent: string;
};

export type MarketingAiCalendarPreviewPalette = {
  canvas: string;
  available: string;
  today: string;
  ink: string;
};

export type MarketingAiVideoMood = {
  from: string;
  to: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseHslComponents(hsl: string): { h: number; s: number; l: number } | null {
  const match = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(hsl.trim());
  if (!match) return null;
  return {
    h: Number(match[1]),
    s: Number(match[2]),
    l: Number(match[3]),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function surfaceHslToHex(surfaceHsl: string, fallback: string): string {
  const parsed = parseHslComponents(surfaceHsl);
  if (!parsed) return fallback;
  return hslToHex(parsed.h, parsed.s, parsed.l);
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const raw = match[1]!;
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

/** Soften an accent toward a mid chip fill (calendar available days / design primary wash). */
function softAccentFill(accentHex: string): string {
  const rgb = parseHex(accentHex);
  if (!rgb) return accentHex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return hslToHex(hsl.h, clamp(hsl.s * 0.85, 28, 58), clamp(hsl.l + 14, 52, 68));
}

function inkFromSurface(surfaceHslDark: string, accentHex: string): string {
  const parsed = parseHslComponents(surfaceHslDark);
  if (parsed) {
    return hslToHex(parsed.h, clamp(parsed.s + 8, 18, 42), clamp(parsed.l + 8, 16, 28));
  }
  const rgb = parseHex(accentHex);
  if (!rgb) return '#2a241f';
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return hslToHex(hsl.h, clamp(hsl.s * 0.55, 16, 40), 22);
}

/**
 * Accent hex for marketing defaults: property-photo palette when available, else org brand.
 * Same sampler as Public page editor → Styles → From photos.
 */
export function resolveMarketingAccentHex(
  brandColor: string | null | undefined,
  mediaPalette: ShowcaseMediaPalette | null | undefined
): string {
  const fromPhotos = mediaPalette?.accentHexLight?.trim();
  if (fromPhotos && /^#[0-9a-f]{6}$/i.test(fromPhotos)) {
    return fromPhotos;
  }
  return resolveOrgBrandHex(brandColor);
}

/** Soft cream canvas + mid fill + accent from a single accent hex (brand fallback). */
export function tokenPaletteFromAccentHex(accentHex: string): MarketingAiTokenPalette {
  const accent = resolveOrgBrandHex(accentHex);
  const rgb = parseHex(accent);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : { h: 28, s: 80, l: 52 };
  const secondary = hslToHex(hsl.h, clamp(hsl.s * 0.22, 8, 28), clamp(Math.max(hsl.l, 88), 93, 98));
  return {
    primary: softAccentFill(accent),
    secondary,
    accent,
  };
}

export function calendarPreviewPaletteFromAccentHex(
  accentHex: string
): MarketingAiCalendarPreviewPalette {
  const tokens = tokenPaletteFromAccentHex(accentHex);
  const rgb = parseHex(tokens.accent);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : { h: 28, s: 40, l: 22 };
  return {
    canvas: tokens.secondary,
    available: tokens.primary,
    today: tokens.accent,
    ink: hslToHex(hsl.h, clamp(hsl.s * 0.55, 16, 40), 22),
  };
}

export function designPreviewPaletteFromAccentHex(accentHex: string): MarketingAiTokenPalette {
  return tokenPaletteFromAccentHex(accentHex);
}

export function videoMoodFromAccentHex(accentHex: string): MarketingAiVideoMood {
  const tokens = tokenPaletteFromAccentHex(accentHex);
  return { from: tokens.secondary, to: tokens.accent };
}

export type MarketingAiLookPresentation = {
  fromPhotos: boolean;
  title: string;
  summary: string;
  tokenPalette: MarketingAiTokenPalette;
  calendarPreview: MarketingAiCalendarPreviewPalette;
  designPreview: MarketingAiTokenPalette;
  videoMood: MarketingAiVideoMood;
};

/** First Look template: photos when available, else brand — same as blank/default accents. */
export function resolveMarketingAiLookPresentation(
  brandColor: string | null | undefined,
  mediaPalette: ShowcaseMediaPalette | null | undefined
): MarketingAiLookPresentation {
  const fromPhotos = Boolean(mediaPalette?.accentHexLight);
  if (mediaPalette && fromPhotos) {
    return {
      fromPhotos: true,
      title: 'Property colors',
      summary: 'From photos',
      tokenPalette: tokenPaletteFromMedia(mediaPalette),
      calendarPreview: calendarPreviewPaletteFromMedia(mediaPalette),
      designPreview: designPreviewPaletteFromMedia(mediaPalette),
      videoMood: videoMoodFromMedia(mediaPalette),
    };
  }
  const accent = resolveOrgBrandHex(brandColor);
  return {
    fromPhotos: false,
    title: 'Property colors',
    summary: 'Brand color',
    tokenPalette: tokenPaletteFromAccentHex(accent),
    calendarPreview: calendarPreviewPaletteFromAccentHex(accent),
    designPreview: designPreviewPaletteFromAccentHex(accent),
    videoMood: videoMoodFromAccentHex(accent),
  };
}

/**
 * Map showcase media palette → AI token palette (primary fill, secondary canvas, accent today/CTA).
 * Same sampler as Public page editor → Styles → From photos.
 */
export function tokenPaletteFromMedia(media: ShowcaseMediaPalette): MarketingAiTokenPalette {
  const secondary = surfaceHslToHex(media.surfaceHslLight, '#faf6f1');
  const primary = softAccentFill(media.accentHexLight);
  const accent = media.accentHexDark || media.accentHexLight;
  return { primary, secondary, accent };
}

export function calendarPreviewPaletteFromMedia(
  media: ShowcaseMediaPalette
): MarketingAiCalendarPreviewPalette {
  const tokens = tokenPaletteFromMedia(media);
  return {
    canvas: tokens.secondary,
    available: tokens.primary,
    today: tokens.accent,
    ink: inkFromSurface(media.surfaceHslDark, media.accentHexLight),
  };
}

export function designPreviewPaletteFromMedia(
  media: ShowcaseMediaPalette
): MarketingAiTokenPalette {
  return tokenPaletteFromMedia(media);
}

export function videoMoodFromMedia(media: ShowcaseMediaPalette): MarketingAiVideoMood {
  const tokens = tokenPaletteFromMedia(media);
  return {
    from: tokens.secondary,
    to: tokens.accent,
  };
}

export function isMarketingAiPhotoPaletteSuggestion(
  contentType: 'calendar' | 'design' | 'video',
  suggestionId: string
): boolean {
  return MARKETING_AI_PHOTO_PALETTE_SUGGESTION_IDS[contentType] === suggestionId;
}
