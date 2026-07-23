import type { CalendarStyles } from '@/features/dashboard/marketing/components/calendar-builder/types';
import { normalizeCalendarStyles } from '@/features/dashboard/marketing/components/calendar-builder/types';
import {
  canvasFrameBackgroundForFormat,
  normalizeCalendarCanvasFrame,
} from '@/features/dashboard/marketing/lib/calendarCanvasFormats';
import { resolveOrgBrandHex } from '@/lib/theme/brandColor';

export type CalendarBrandPalette = {
  brand: string;
  brandLight: string;
  brandDark: string;
};

function parseHex(hex: string): { r: number; g: number; b: number } | null {
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

function mixHex(
  base: string,
  target: { r: number; g: number; b: number },
  targetWeight: number
): string {
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

/** Light tint for “today” cell background. */
export function calendarBrandLightTint(brandColor?: string): string {
  const brand = resolveOrgBrandHex(brandColor);
  return mixHex(brand, { r: 255, g: 255, b: 255 }, 0.9);
}

/** Slightly darker brand for secondary status (e.g. checked-in). */
export function calendarBrandDarkShade(brandColor?: string): string {
  const brand = resolveOrgBrandHex(brandColor);
  return mixHex(brand, { r: 0, g: 0, b: 0 }, 0.18);
}

export function calendarBrandPalette(brandColor?: string): CalendarBrandPalette {
  const brand = resolveOrgBrandHex(brandColor);
  return {
    brand,
    brandLight: calendarBrandLightTint(brand),
    brandDark: calendarBrandDarkShade(brand),
  };
}

/** Map org/property brand onto calendar accent states (booked, today, bars, canvas). */
export function applyBrandAccentToCalendarStyles(
  styles: CalendarStyles,
  brandColor?: string
): CalendarStyles {
  const palette = calendarBrandPalette(brandColor);
  const frame = normalizeCalendarCanvasFrame(styles.canvasFrame, palette.brand);

  return normalizeCalendarStyles({
    ...styles,
    header: {
      ...styles.header,
      propertyName: {
        ...styles.header.propertyName,
        color: palette.brand,
      },
    },
    today: {
      ...styles.today,
      background: { type: 'solid', color: palette.brandLight },
      border: { ...styles.today.border, color: palette.brand },
      dayNumberColor: palette.brand,
      indicator: { ...styles.today.indicator, color: palette.brand },
    },
    booked: {
      ...styles.booked,
      background: { type: 'solid', color: palette.brand },
    },
    bookingBar: {
      ...styles.bookingBar,
      background: { type: 'solid', color: palette.brand },
      statusColors: {
        ...styles.bookingBar.statusColors,
        confirmed: palette.brand,
        checkedIn: palette.brandDark,
      },
    },
    canvasFrame: {
      ...frame,
      background:
        frame.format === 'square'
          ? frame.background
          : canvasFrameBackgroundForFormat(frame.format, palette.brand),
    },
  });
}
