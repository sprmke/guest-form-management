import { resolveCalendarPresetStyles } from '@/features/dashboard/marketing/components/calendar-builder/stores/calendar-builder-store';
import {
  normalizeCalendarStyles,
  type CalendarStyles,
} from '@/features/dashboard/marketing/components/calendar-builder/types';
import {
  calendarFormatToAspectPreset,
  canvasFrameDefaultsForFormat,
  type CalendarCanvasFormat,
} from '@/features/dashboard/marketing/lib/calendarCanvasFormats';
import { applyPropertyPhotoToCalendarStyles } from '@/features/dashboard/marketing/lib/calendarPropertyPhoto';

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

const ARCHETYPE_SEED: Record<CalendarLayoutArchetype, string> = {
  bubble: 'social-availability',
  widget: 'sunrise-select',
  'type-forward': 'desk-type',
  'geo-pattern': 'bauhaus-geo',
  botanical: 'garden-glow',
  'photo-wash': 'property-hero',
  'dusk-gradient': 'velvet-guest',
};

const FONT_PAIRINGS: Record<CalendarFontPairing, { display: string; body: string; label: string }> =
  {
    'soft-sans': { display: 'Poppins', body: 'Nunito Sans', label: 'Poppins' },
    'editorial-serif': { display: 'Fraunces', body: 'Nunito Sans', label: 'Jost' },
    'playful-rounded': { display: 'Nunito', body: 'Nunito Sans', label: 'Poppins' },
    'modern-clean': { display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', label: 'Jost' },
  };

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function safeHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

function mixTowardWhite(hex: string, amount: number): string {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!match) return hex;
  const raw = match[1];
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const t = Math.max(0, Math.min(1, amount));
  const mix = (channel: number) => Math.round(channel * (1 - t) + 255 * t);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function replaceHexColors(
  value: string,
  primary: string,
  secondary: string,
  accent: string
): string {
  // Soft remap of common pastel seeds → AI palette (keeps non-hex / rgba intact).
  if (!HEX_RE.test(value)) return value;
  const lower = value.toLowerCase();
  // Heuristic buckets by luminance-ish first channel
  const r = parseInt(lower.slice(1, 3), 16);
  const g = parseInt(lower.slice(3, 5), 16);
  const b = parseInt(lower.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 18 && max > 230) return secondary;
  if (max - min < 25 && max > 200) return mixTowardWhite(primary, 0.72);
  if (r > g + 20 && r > b + 10) return accent;
  if (max > 160) return primary;
  return mixTowardWhite(primary, 0.2);
}

function recolorStyles(
  styles: CalendarStyles,
  primary: string,
  secondary: string,
  accent: string
): CalendarStyles {
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') return replaceHexColors(node, primary, secondary, accent);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
        out[key] = walk(child);
      }
      return out;
    }
    return node;
  };
  return walk(styles) as CalendarStyles;
}

function applyFontPairing(styles: CalendarStyles, pairing: CalendarFontPairing): CalendarStyles {
  const fonts = FONT_PAIRINGS[pairing];
  return {
    ...styles,
    header: {
      ...styles.header,
      propertyName: {
        ...styles.header.propertyName,
        font: { ...styles.header.propertyName.font, family: fonts.label },
      },
      monthYear: {
        ...styles.header.monthYear,
        font: { ...styles.header.monthYear.font, family: fonts.display },
      },
      subtitle: {
        ...styles.header.subtitle,
        font: { ...styles.header.subtitle.font, family: fonts.body },
      },
    },
    dayNames: {
      ...styles.dayNames,
      font: { ...styles.dayNames.font, family: fonts.label },
    },
    cell: {
      ...styles.cell,
      dayNumber: {
        ...styles.cell.dayNumber,
        font: { ...styles.cell.dayNumber.font, family: fonts.body },
      },
    },
  };
}

function applyBackgroundMood(
  styles: CalendarStyles,
  mood: CalendarBackgroundMood,
  primary: string,
  secondary: string,
  propertyPhotoUrl?: string
): CalendarStyles {
  if (mood === 'photo-wash' && propertyPhotoUrl) {
    return {
      ...styles,
      container: {
        ...styles.container,
        background: {
          type: 'image',
          color: secondary,
          imageUrl: propertyPhotoUrl,
          imageSize: 'cover',
          imagePosition: 'center',
          overlay: 'rgba(255,255,255,0.78)',
          opacity: 1,
        },
      },
    };
  }

  if (mood === 'soft-gradient') {
    return {
      ...styles,
      container: {
        ...styles.container,
        background: {
          type: 'gradient',
          color: secondary,
          gradient: {
            type: 'linear',
            angle: 165,
            stops: [
              { color: secondary, position: 0 },
              { color: mixTowardWhite(primary, 0.82), position: 100 },
            ],
          },
        },
      },
    };
  }

  if (mood === 'pattern-dots') {
    return {
      ...styles,
      container: {
        ...styles.container,
        background: {
          type: 'pattern',
          color: secondary,
          pattern: {
            type: 'dots',
            color: mixTowardWhite(primary, 0.55),
            size: 10,
            opacity: 0.35,
          },
        },
      },
    };
  }

  return {
    ...styles,
    container: {
      ...styles.container,
      background: { type: 'solid', color: secondary },
    },
  };
}

export function normalizeCalendarTemplateTokens(
  raw: Partial<CalendarTemplateTokens> | null | undefined
): CalendarTemplateTokens {
  const palette = raw?.palette ?? { primary: '#a48ee0', secondary: '#f3edfd', accent: '#ff8fa8' };
  return {
    layoutArchetype: raw?.layoutArchetype ?? 'bubble',
    palette: {
      primary: safeHex(palette.primary, '#a48ee0'),
      secondary: safeHex(palette.secondary, '#f3edfd'),
      accent: safeHex(palette.accent, '#ff8fa8'),
    },
    fontPairing: raw?.fontPairing ?? 'soft-sans',
    backgroundMood: raw?.backgroundMood ?? 'solid-cream',
    subtitle: (raw?.subtitle ?? 'Available dates').trim().slice(0, 48) || 'Available dates',
    label: (raw?.label ?? 'AI calendar').trim().slice(0, 40) || 'AI calendar',
  };
}

export type ResolveAiCalendarOptions = {
  format: CalendarCanvasFormat;
  brandColor?: string;
  propertyPhotoUrl?: string;
};

/** Compile AI tokens into editable CalendarStyles for one canvas format. */
export function resolveAiGeneratedCalendarStyles(
  tokensInput: Partial<CalendarTemplateTokens>,
  options: ResolveAiCalendarOptions
): CalendarStyles {
  const tokens = normalizeCalendarTemplateTokens(tokensInput);
  const seedId = ARCHETYPE_SEED[tokens.layoutArchetype];
  let styles = resolveCalendarPresetStyles(seedId);

  styles = recolorStyles(
    styles,
    tokens.palette.primary,
    tokens.palette.secondary,
    tokens.palette.accent
  );
  styles = applyFontPairing(styles, tokens.fontPairing);
  styles = applyBackgroundMood(
    styles,
    tokens.backgroundMood,
    tokens.palette.primary,
    tokens.palette.secondary,
    options.propertyPhotoUrl
  );

  styles = {
    ...styles,
    header: {
      ...styles.header,
      subtitle: {
        ...styles.header.subtitle,
        show: true,
        text: tokens.subtitle,
        color: mixTowardWhite(tokens.palette.primary, 0.35),
      },
    },
  };

  const frameDefaults = canvasFrameDefaultsForFormat(options.format, options.brandColor);
  styles = normalizeCalendarStyles({
    ...styles,
    canvasFrame: {
      format: options.format,
      padding: frameDefaults.padding,
      calendarScale: frameDefaults.calendarScale,
      background: frameDefaults.background,
    },
  });

  return applyPropertyPhotoToCalendarStyles(styles, options.propertyPhotoUrl);
}

export const CALENDAR_AI_FORMATS: CalendarCanvasFormat[] = ['square', 'portrait', 'landscape'];

/** One AI design → three format-ready style payloads (no extra AI calls). */
export function resolveAiGeneratedCalendarStylesForAllFormats(
  tokensInput: Partial<CalendarTemplateTokens>,
  options: Omit<ResolveAiCalendarOptions, 'format'>
): Array<{ format: CalendarCanvasFormat; aspectPreset: string; styles: CalendarStyles }> {
  return CALENDAR_AI_FORMATS.map((format) => ({
    format,
    aspectPreset: calendarFormatToAspectPreset(format),
    styles: resolveAiGeneratedCalendarStyles(tokensInput, { ...options, format }),
  }));
}
