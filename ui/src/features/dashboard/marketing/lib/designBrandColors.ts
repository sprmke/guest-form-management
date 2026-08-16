import { resolveOrgBrandHex } from '@/lib/theme/brandColor';

const PRESET_ACCENT = '#e8752a';
const INK = '#5c3d2e';

export type CampaignPalette = {
  accent: string;
  accentDark: string;
  accentForeground: string;
  ink: string;
  cream: string;
  success: string;
  danger: string;
};

export type ApplyBrandAccentOptions = {
  preservePresetPalette?: boolean;
  /** Designer accent when `preservePresetPalette` is set (e.g. raffle gold, stamp ink). */
  presetAccent?: string;
};

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb | null {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) return null;
  const raw = match[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixHex(base: string, target: Rgb, targetWeight: number): string {
  const rgb = parseHex(base);
  if (!rgb) return base;
  const weight = Math.max(0, Math.min(1, targetWeight));
  const keep = 1 - weight;
  return toHex(
    rgb.r * keep + target.r * weight,
    rgb.g * keep + target.g * weight,
    rgb.b * keep + target.b * weight
  );
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(left: Rgb, right: Rgb): number {
  const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

export function foregroundFor(background: string): string {
  const rgb = parseHex(background);
  const white = parseHex('#ffffff')!;
  const ink = parseHex(INK)!;
  if (!rgb) return '#ffffff';
  return contrastRatio(rgb, white) >= contrastRatio(rgb, ink) ? '#ffffff' : INK;
}

export function campaignAccentLight(accent: string): string {
  return mixHex(accent, { r: 255, g: 255, b: 255 }, 0.38);
}

export function resolveCampaignPalette(
  brandColor?: string,
  options?: ApplyBrandAccentOptions
): CampaignPalette {
  const preservedAccent =
    options?.presetAccent && parseHex(options.presetAccent) ? options.presetAccent : PRESET_ACCENT;
  const accent = options?.preservePresetPalette ? preservedAccent : resolveOrgBrandHex(brandColor);
  return {
    accent,
    accentDark: mixHex(accent, { r: 0, g: 0, b: 0 }, 0.18),
    accentForeground: foregroundFor(accent),
    ink: INK,
    cream: '#fff7eb',
    success: '#16a34a',
    danger: '#dc2626',
  };
}
