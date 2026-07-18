/** Teal green — matches `--sidebar-primary` (`168 65% 40%`) in index.css. */
export const DEFAULT_ORG_BRAND_COLOR = '#24a88e';

type Hsl = { h: number; s: number; l: number };
type Rgb = { r: number; g: number; b: number };

function parseHexColor(hex: string): Rgb | null {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) return null;
  const raw = match[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shiftHue(h: number, delta: number): number {
  return (((h + delta) % 360) + 360) % 360;
}

function hslString({ h, s, l }: Hsl): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/** 3-stop 135° brand gradient — same lightness stops as default teal UX. */
export function buildBrandGradientCss(h: number, s: number, isDark: boolean): string {
  const brandS = Math.round(clamp(s, 35, 95));
  const hR = Math.round(h);
  const [l1, l2, l3] = isDark ? [50, 46, 42] : [46, 42, 38];
  return `linear-gradient(135deg, hsl(${hR} ${brandS}% ${l1}%) 0%, hsl(${hR} ${brandS}% ${l2}%) 45%, hsl(${hR} ${brandS}% ${l3}%) 100%)`;
}

export function hexToHslComponents(hex: string): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return hexToHslComponents(DEFAULT_ORG_BRAND_COLOR);
  return hslString(rgbToHsl(rgb));
}

/** Lighter → darker HSL stops for mode-switch SVG gradient overlay. */
export function brandTransitionGradientStops(
  brandColor: string | null | undefined,
  isDark: boolean
): { from: string; to: string } {
  const theme = buildDashboardBrandStyle(brandColor, isDark);
  return {
    from: `hsl(${theme['--gradient-primary-from']!})`,
    to: `hsl(${theme['--gradient-primary-to']!})`,
  };
}

/** Read gradient stops already applied on `:root` (admin shell, guest brand shell). */
export function readCssBrandGradientStops(): { from: string; to: string } | null {
  if (typeof document === 'undefined') return null;

  const style = getComputedStyle(document.documentElement);
  const from = style.getPropertyValue('--gradient-primary-from').trim();
  const to = style.getPropertyValue('--gradient-primary-to').trim();
  if (!from || !to) return null;

  return { from: `hsl(${from})`, to: `hsl(${to})` };
}

/** Context hex → applied CSS vars → platform default. */
export function resolveBrandTransitionGradientStops(
  brandColor: string | null | undefined,
  isDark: boolean
): { from: string; to: string } {
  const trimmed = brandColor?.trim();
  if (trimmed && parseHexColor(trimmed)) {
    return brandTransitionGradientStops(trimmed, isDark);
  }

  const cssStops = readCssBrandGradientStops();
  if (cssStops) return cssStops;

  return brandTransitionGradientStops(null, isDark);
}

export function resolveOrgBrandHex(brandColor: string | null | undefined): string {
  const trimmed = brandColor?.trim();
  if (trimmed && parseHexColor(trimmed)) return trimmed;
  return DEFAULT_ORG_BRAND_COLOR;
}

/** @deprecated Alias for resolveOrgBrandHex */
export const resolveGuestBrandHex = resolveOrgBrandHex;

export function isDefaultOrgBrandColor(brandColor: string | null | undefined): boolean {
  return resolveOrgBrandHex(brandColor).toLowerCase() === DEFAULT_ORG_BRAND_COLOR.toLowerCase();
}

/** Property settings form value — show inherited org color when no property override is stored. */
export function propertyBrandColorFormValue(
  stored: string | null | undefined,
  resolvedBrandColor: string
): string {
  const trimmed = stored?.trim() ?? '';
  return trimmed || resolveOrgBrandHex(resolvedBrandColor);
}

/** DB patch value — empty string clears property override (inherit org). */
export function propertyBrandColorStoredValue(
  draftColor: string,
  resolvedBrandColor: string
): string {
  const trimmed = draftColor.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase() === resolveOrgBrandHex(resolvedBrandColor).toLowerCase()) {
    return '';
  }
  return trimmed;
}

export function propertyBrandColorsEquivalent(
  left: string,
  right: string,
  resolvedBrandColor: string
): boolean {
  return (
    propertyBrandColorStoredValue(left, resolvedBrandColor).toLowerCase() ===
    propertyBrandColorStoredValue(right, resolvedBrandColor).toLowerCase()
  );
}

/** Fallback dashboard theme when hex parsing fails (teal primary). */
const DEFAULT_LIGHT_THEME: Record<string, string> = {
  '--primary': '168 65% 40%',
  '--primary-foreground': '0 0% 100%',
  '--ring': '168 65% 40%',
  '--success': '168 65% 40%',
  '--info': '168 65% 46%',
  '--glow-color': '168 65% 40%',
  '--sidebar-primary': '168 65% 40%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-ring': '168 65% 40%',
  '--chart-1': '168 65% 40%',
  '--chart-2': '168 65% 50%',
  '--gradient-primary-from': '168 65% 46%',
  '--gradient-primary-to': '168 65% 38%',
  '--gradient-primary-mid': '168 65% 42%',
  '--mesh-a': '168 65% 40%',
  '--mesh-b': '168 65% 50%',
  '--brand-highlight': '168 65% 46%',
  '--brand-highlight-end': '168 65% 40%',
  '--brand-range-bg-start': '168 55% 92%',
  '--brand-range-bg-end': '168 50% 88%',
  '--brand-range-fg': '168 65% 28%',
  '--brand-gradient':
    'linear-gradient(135deg, hsl(168 65% 46%) 0%, hsl(168 65% 42%) 45%, hsl(168 65% 38%) 100%)',
};

const DEFAULT_DARK_THEME: Record<string, string> = {
  '--primary': '168 65% 45%',
  '--primary-foreground': '0 0% 100%',
  '--ring': '168 65% 45%',
  '--success': '168 65% 45%',
  '--info': '168 65% 50%',
  '--glow-color': '168 65% 45%',
  '--sidebar-primary': '168 65% 45%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-ring': '168 65% 45%',
  '--chart-1': '168 65% 45%',
  '--chart-2': '168 65% 55%',
  '--gradient-primary-from': '168 65% 50%',
  '--gradient-primary-to': '168 65% 42%',
  '--gradient-primary-mid': '168 65% 46%',
  '--mesh-a': '168 65% 45%',
  '--mesh-b': '168 65% 55%',
  '--brand-highlight': '168 65% 50%',
  '--brand-highlight-end': '168 65% 45%',
  '--brand-range-bg-start': '168 40% 18%',
  '--brand-range-bg-end': '168 35% 14%',
  '--brand-range-fg': '168 65% 72%',
  '--brand-gradient':
    'linear-gradient(135deg, hsl(168 65% 50%) 0%, hsl(168 65% 46%) 45%, hsl(168 65% 42%) 100%)',
};

function generateBrandTheme(hex: string, isDark: boolean): Record<string, string> {
  const base = rgbToHsl(parseHexColor(hex)!);
  const { h, s, l } = base;

  const primaryS = clamp(s, 35, 95);
  const primaryL = isDark ? clamp(l + 5, 42, 62) : clamp(l - 2, 38, 55);
  const primary = hslString({ h, s: primaryS, l: primaryL });

  const [gradientL1, gradientL2, gradientL3] = isDark ? [50, 46, 42] : [46, 42, 38];
  const brandGradient = buildBrandGradientCss(h, primaryS, isDark);
  const gradientFrom = hslString({ h, s: primaryS, l: gradientL1 });
  const gradientMid = hslString({ h, s: primaryS, l: gradientL2 });
  const gradientTo = hslString({ h, s: primaryS, l: gradientL3 });

  const secondaryH = shiftHue(h, -49);
  const secondaryS = clamp(s * 0.72, 45, 75);
  const secondaryL = isDark ? 45 : 40;
  const secondary = hslString({ h: secondaryH, s: secondaryS, l: secondaryL });

  const brandHighlight = gradientFrom;
  const brandHighlightEnd = gradientTo;

  const infoL = isDark ? clamp(primaryL + 7, 55, 70) : clamp(primaryL + 7, 55, 65);
  const chart2L = isDark ? clamp(primaryL + 10, 50, 75) : clamp(primaryL + 10, 48, 68);

  const meshB = hslString({
    h: shiftHue(secondaryH, 10),
    s: clamp(secondaryS, 45, 75),
    l: clamp(secondaryL + 10, 35, 58),
  });

  const rangeBgStart = hslString({
    h: secondaryH,
    s: clamp(secondaryS - 10, 35, 65),
    l: isDark ? 18 : 92,
  });
  const rangeBgEnd = hslString({
    h: secondaryH,
    s: clamp(secondaryS - 15, 30, 60),
    l: isDark ? 14 : 88,
  });
  const rangeFg = hslString({
    h: secondaryH,
    s: clamp(secondaryS, 45, 80),
    l: isDark ? 72 : 28,
  });

  return {
    '--primary': primary,
    '--primary-foreground': '0 0% 100%',
    '--ring': primary,
    '--success': primary,
    '--info': hslString({ h, s: primaryS, l: infoL }),
    '--glow-color': primary,
    '--sidebar-primary': secondary,
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-ring': secondary,
    '--chart-1': primary,
    '--chart-2': hslString({ h, s: clamp(primaryS - 10, 40, 90), l: chart2L }),
    '--gradient-primary-from': gradientFrom,
    '--gradient-primary-to': gradientTo,
    '--gradient-primary-mid': gradientMid,
    '--brand-gradient': brandGradient,
    '--mesh-a': secondary,
    '--mesh-b': meshB,
    '--brand-highlight': brandHighlight,
    '--brand-highlight-end': brandHighlightEnd,
    '--brand-range-bg-start': rangeBgStart,
    '--brand-range-bg-end': rangeBgEnd,
    '--brand-range-fg': rangeFg,
  };
}

/** Full admin dashboard theme from org brand color. */
export function buildDashboardBrandStyle(
  brandColor: string | null | undefined,
  isDark: boolean
): Record<string, string> {
  const hex = resolveOrgBrandHex(brandColor);
  if (!parseHexColor(hex)) {
    return isDark ? { ...DEFAULT_DARK_THEME } : { ...DEFAULT_LIGHT_THEME };
  }
  return generateBrandTheme(hex, isDark);
}

/** CSS custom properties scoped to guest-facing shells. */
export function buildGuestBrandStyle(
  brandColor: string | null | undefined,
  isDark: boolean
): Record<string, string> {
  const theme = buildDashboardBrandStyle(brandColor, isDark);
  return {
    '--primary': theme['--primary']!,
    '--primary-foreground': theme['--primary-foreground']!,
    '--ring': theme['--ring']!,
    '--success': theme['--success']!,
    '--glow-color': theme['--glow-color']!,
    '--gradient-primary-from': theme['--gradient-primary-from']!,
    '--gradient-primary-to': theme['--gradient-primary-to']!,
    '--gradient-primary-mid': theme['--gradient-primary-mid']!,
    '--brand-gradient': theme['--brand-gradient']!,
    '--mesh-a': theme['--mesh-a']!,
    '--mesh-b': theme['--mesh-b']!,
    '--brand-highlight': theme['--brand-highlight']!,
    '--brand-highlight-end': theme['--brand-highlight-end']!,
  };
}
