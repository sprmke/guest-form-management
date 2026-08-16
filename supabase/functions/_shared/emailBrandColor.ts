import { DEFAULT_ORG_BRAND_COLOR } from './orgSettingsValidation.ts';

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) return null;
  const raw = match[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function resolveBrandHex(brandColorHex?: string | null): string {
  const trimmed = brandColorHex?.trim();
  if (trimmed && parseHexColor(trimmed)) return trimmed;
  return DEFAULT_ORG_BRAND_COLOR;
}

/**
 * Same hex as the Brand color picker / admin `--primary` (not a darkened derivative).
 */
export function resolveEmailPrimaryHex(brandColorHex?: string | null): string {
  return resolveBrandHex(brandColorHex);
}

/** CTA / on-fill text — white, matching admin `--primary-foreground`. */
export function resolveEmailOnPrimaryHex(_brandColorHex?: string | null): string {
  return '#ffffff';
}
