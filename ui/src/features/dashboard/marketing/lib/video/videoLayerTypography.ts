import type { CSSProperties } from 'react';

import type {
  VideoLayerTypography,
  VideoSceneLayer,
  VideoTextStyle,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';

/** Fonts preloaded in ui/index.html — safe for Remotion preview + export. */
export const VIDEO_FONT_FAMILIES = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'Sora', label: 'Sora' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Inter Tight', label: 'Inter Tight' },
  { value: 'Figtree', label: 'Figtree' },
  { value: 'Nunito Sans', label: 'Nunito Sans' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Fraunces', label: 'Fraunces' },
  { value: 'Lora', label: 'Lora' },
  { value: 'system-ui', label: 'System' },
] as const;

export type VideoTextPresetId = 'title' | 'subtitle' | 'promo' | 'body' | 'label' | 'cta';

export const VIDEO_TEXT_PRESETS: Record<
  VideoTextPresetId,
  {
    label: string;
    textStyle: VideoTextStyle;
    typography: Omit<VideoLayerTypography, 'color' | 'backgroundColor'>;
  }
> = {
  title: {
    label: 'Title',
    textStyle: 'headline',
    typography: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 52,
      fontWeight: 800,
      letterSpacing: 0,
      lineHeight: 1.1,
      textTransform: 'uppercase',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      shadow: true,
    },
  },
  subtitle: {
    label: 'Subtitle',
    textStyle: 'subheadline',
    typography: {
      fontFamily: 'DM Sans',
      fontSize: 36,
      fontWeight: 600,
      letterSpacing: 0.5,
      lineHeight: 1.2,
      textTransform: 'none',
      strokeColor: null,
      strokeWidth: 0,
      shadow: true,
    },
  },
  promo: {
    label: 'Promo',
    textStyle: 'promo',
    typography: {
      fontFamily: 'Space Grotesk',
      fontSize: 88,
      fontWeight: 800,
      letterSpacing: -1,
      lineHeight: 1,
      textTransform: 'uppercase',
      strokeColor: '#5c3d2e',
      strokeWidth: 3,
      shadow: false,
    },
  },
  body: {
    label: 'Body',
    textStyle: 'body',
    typography: {
      fontFamily: 'DM Sans',
      fontSize: 32,
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1.25,
      textTransform: 'none',
      strokeColor: null,
      strokeWidth: 0,
      shadow: true,
    },
  },
  label: {
    label: 'Label',
    textStyle: 'footer',
    typography: {
      fontFamily: 'DM Sans',
      fontSize: 26,
      fontWeight: 600,
      letterSpacing: 1,
      lineHeight: 1.2,
      textTransform: 'uppercase',
      strokeColor: null,
      strokeWidth: 0,
      shadow: true,
    },
  },
  cta: {
    label: 'CTA',
    textStyle: 'body',
    typography: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 28,
      fontWeight: 700,
      letterSpacing: 0.5,
      lineHeight: 1,
      textTransform: 'uppercase',
      strokeColor: null,
      strokeWidth: 0,
      shadow: false,
    },
  },
};

function presetColors(
  preset: VideoTextPresetId,
  brandColor: string
): Pick<VideoLayerTypography, 'color' | 'backgroundColor'> {
  if (preset === 'cta') {
    return { color: '#ffffff', backgroundColor: brandColor };
  }
  if (preset === 'title') {
    return { color: brandColor, backgroundColor: null };
  }
  if (preset === 'promo') {
    return { color: '#fff8f0', backgroundColor: null };
  }
  return { color: '#fff8f0', backgroundColor: null };
}

export function typographyPresetForLayer(layer: VideoSceneLayer): VideoTextPresetId {
  if (layer.kind === 'cta') return 'cta';
  switch (layer.textStyle) {
    case 'subheadline':
      return 'subtitle';
    case 'promo':
      return 'promo';
    case 'footer':
      return 'label';
    case 'body':
      return 'body';
    default:
      return 'title';
  }
}

function baseTypographyForStyle(
  style: VideoTextStyle,
  brandColor: string,
  kind: VideoSceneLayer['kind']
): VideoLayerTypography {
  const presetId =
    kind === 'cta'
      ? 'cta'
      : style === 'subheadline'
        ? 'subtitle'
        : style === 'promo'
          ? 'promo'
          : style === 'footer'
            ? 'label'
            : style === 'body'
              ? 'body'
              : 'title';
  const preset = VIDEO_TEXT_PRESETS[presetId];
  return {
    ...preset.typography,
    ...presetColors(presetId, brandColor),
  };
}

export function resolveLayerTypography(
  layer: VideoSceneLayer,
  brandColor: string
): VideoLayerTypography {
  const base = baseTypographyForStyle(layer.textStyle ?? 'headline', brandColor, layer.kind);
  if (!layer.typography) return base;
  return { ...base, ...layer.typography };
}

export function buildTypographyFromPreset(
  presetId: VideoTextPresetId,
  brandColor: string
): VideoLayerTypography {
  const preset = VIDEO_TEXT_PRESETS[presetId];
  return {
    ...preset.typography,
    ...presetColors(presetId, brandColor),
  };
}

export function typographyToCss(
  typography: VideoLayerTypography,
  scale: number,
  options?: { isCta?: boolean }
): CSSProperties {
  const fontSize = Math.round(typography.fontSize * scale);
  const strokeWidth = typography.strokeWidth ?? 0;
  const strokeColor = typography.strokeColor;

  const style: CSSProperties = {
    fontFamily: typography.fontFamily,
    fontSize,
    fontWeight: typography.fontWeight,
    color: typography.color,
    lineHeight: typography.lineHeight ?? 1.15,
    letterSpacing: typography.letterSpacing ? `${typography.letterSpacing * scale}px` : undefined,
    textTransform: typography.textTransform ?? 'none',
    textShadow: typography.shadow ? '0 2px 16px rgba(0,0,0,0.45)' : undefined,
  };

  if (strokeWidth > 0 && strokeColor) {
    style.WebkitTextStroke = `${Math.max(1, Math.round(strokeWidth * scale))}px ${strokeColor}`;
  }

  if (options?.isCta && typography.backgroundColor) {
    return {
      ...style,
      backgroundColor: typography.backgroundColor,
      borderRadius: 999,
      padding: `${Math.round(14 * scale)}px ${Math.round(36 * scale)}px`,
      display: 'inline-block',
    };
  }

  return style;
}
