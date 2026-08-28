import type { PropertyShowcaseConfig } from '@/features/guest/marketing/showcase/types/showcase';

type DisplayFont = PropertyShowcaseConfig['typography']['displayFont'];
type TypeScale = PropertyShowcaseConfig['typography']['scale'];
type MotionIntensity = PropertyShowcaseConfig['motion']['intensity'];
type PaletteOverlay = PropertyShowcaseConfig['palette']['overlay'];

const DISPLAY_FONT_CLASS: Record<DisplayFont, string> = {
  jakarta: 'font-sans',
  outfit: 'font-outfit',
  instrument: 'font-instrument',
  cormorant: 'font-cormorant',
  fraunces: 'font-fraunces',
};

/** Shadcn `--primary` expects space-separated HSL components (no hsl() wrapper). */
export function showcasePrimaryCssVar(accentColor: string): string {
  const match = accentColor.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if (match) return `${match[1]} ${match[2]}% ${match[3]}%`;
  return accentColor;
}

/** Resolved accent for inline gradients (Framer Motion cannot use `var(--primary)` reliably). */
export function showcaseAccentHsla(accentColor: string, alpha: number): string {
  const hslMatch = accentColor.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if (hslMatch) {
    return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${alpha})`;
  }

  const hex = accentColor.trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    const expanded = hex
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('');
    return showcaseAccentHsla(`#${expanded}`, alpha);
  }
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return `hsla(168, 65%, 40%, ${alpha})`;
}

export function resolveShowcaseDisplayFontClass(config: PropertyShowcaseConfig): string {
  return DISPLAY_FONT_CLASS[config.typography.displayFont] ?? DISPLAY_FONT_CLASS.outfit;
}

export function resolveShowcaseHeadingScaleClass(scale: TypeScale): string {
  if (scale === 'sm') return 'showcase-scale-sm';
  if (scale === 'lg') return 'showcase-scale-lg';
  return 'showcase-scale-md';
}

export function resolveShowcaseBodyScaleClass(scale: TypeScale): string {
  if (scale === 'sm') return 'text-[15px] leading-relaxed';
  if (scale === 'lg') return 'text-[17px] leading-relaxed';
  return 'text-base leading-relaxed';
}

export function resolveShowcaseHeroOverlayClass(overlay: PaletteOverlay): string {
  if (overlay === 'strong') return 'from-black/90 via-black/50 to-black/20';
  if (overlay === 'soft') return 'from-black/70 via-black/30 to-black/10';
  return 'from-black/55 via-black/25 to-transparent';
}

export function resolveShowcaseWarmTintClass(
  paletteMode: PropertyShowcaseConfig['palette']['mode']
): string {
  return paletteMode === 'warm' ? 'showcase-warm-tint' : '';
}

export function resolveShowcaseMotionReduced(
  config: PropertyShowcaseConfig,
  reducedMotion: boolean,
  embed: boolean
): boolean {
  if (reducedMotion || embed) return true;
  return config.motion.intensity === 'subtle';
}

export function resolveShowcaseRevealDuration(intensity: MotionIntensity): number {
  if (intensity === 'subtle') return 0.45;
  if (intensity === 'bold') return 0.95;
  return 0.7;
}

export function resolveShowcaseParallaxEnabled(
  config: PropertyShowcaseConfig,
  reducedMotion: boolean,
  embed: boolean
): boolean {
  if (reducedMotion || embed || !config.motion.parallax) return false;
  return config.motion.intensity !== 'subtle';
}
