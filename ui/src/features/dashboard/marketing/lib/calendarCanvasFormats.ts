import type { MarketingFormatOption } from '@/features/dashboard/marketing/components/shared/MarketingFormatPicker';
import type { BackgroundConfig } from '@/features/dashboard/marketing/components/calendar-builder/types';
import { DEFAULT_ORG_BRAND_COLOR } from '@/lib/theme/brandColor';

export type CalendarCanvasFormat = 'square' | 'portrait' | 'landscape';

export type CalendarCanvasFrameStyles = {
  format: CalendarCanvasFormat;
  background: BackgroundConfig;
  /** Padding between canvas edge and calendar card (export pixels at 1080 base). */
  padding: number;
  /** Calendar square size as % of usable inner area. */
  calendarScale: number;
};

export const CALENDAR_CANVAS_DIMENSIONS: Record<
  CalendarCanvasFormat,
  { width: number; height: number; label: string; aspect: string }
> = {
  square: { width: 1080, height: 1080, label: 'Square', aspect: '1:1' },
  portrait: { width: 1080, height: 1920, label: 'Portrait', aspect: '9:16' },
  landscape: { width: 1920, height: 1080, label: 'Landscape', aspect: '16:9' },
};

export const CALENDAR_FORMAT_OPTIONS: MarketingFormatOption[] = (
  Object.keys(CALENDAR_CANVAS_DIMENSIONS) as CalendarCanvasFormat[]
).map((key) => ({
  value: key,
  width: CALENDAR_CANVAS_DIMENSIONS[key].width,
  height: CALENDAR_CANVAS_DIMENSIONS[key].height,
}));

const FRAME_DEFAULTS: Record<
  CalendarCanvasFormat,
  Pick<CalendarCanvasFrameStyles, 'padding' | 'calendarScale'>
> = {
  square: {
    padding: 32,
    calendarScale: 96,
  },
  portrait: {
    padding: 96,
    calendarScale: 86,
  },
  landscape: {
    padding: 72,
    calendarScale: 84,
  },
};

function squareBackground(): BackgroundConfig {
  return { type: 'solid', color: '#ffffff' };
}

function brandBackground(brandColor: string): BackgroundConfig {
  return { type: 'solid', color: brandColor };
}

export function canvasFrameBackgroundForFormat(
  format: CalendarCanvasFormat,
  brandColor?: string
): BackgroundConfig {
  if (format === 'square') return squareBackground();
  return brandBackground(brandColor?.trim() || DEFAULT_ORG_BRAND_COLOR);
}

export function createDefaultCanvasFrame(
  format: CalendarCanvasFormat = 'square',
  brandColor?: string
): CalendarCanvasFrameStyles {
  return {
    format,
    ...FRAME_DEFAULTS[format],
    background: canvasFrameBackgroundForFormat(format, brandColor),
  };
}

export function canvasFrameDefaultsForFormat(
  format: CalendarCanvasFormat,
  brandColor?: string
): Pick<CalendarCanvasFrameStyles, 'padding' | 'calendarScale' | 'background'> {
  return {
    ...FRAME_DEFAULTS[format],
    background: canvasFrameBackgroundForFormat(format, brandColor),
  };
}

export function computeCalendarSquareSize(
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  calendarScalePercent: number
): number {
  const innerW = Math.max(0, canvasWidth - padding * 2);
  const innerH = Math.max(0, canvasHeight - padding * 2);
  const base = Math.min(innerW, innerH);
  return Math.max(120, Math.floor(base * (calendarScalePercent / 100)));
}

export function calendarPreviewWidthForFormat(format: CalendarCanvasFormat): number {
  if (format === 'landscape') return 520;
  if (format === 'portrait') return 300;
  return 400;
}

export function calendarPreviewLayout(
  format: CalendarCanvasFormat,
  zoomLevelPercent: number
): {
  nativeWidth: number;
  nativeHeight: number;
  baseScale: number;
  displayScale: number;
  layoutWidth: number;
  layoutHeight: number;
} {
  const dims = CALENDAR_CANVAS_DIMENSIONS[format];
  const previewWidth = calendarPreviewWidthForFormat(format);
  const baseScale = previewWidth / dims.width;
  const displayScale = baseScale * (zoomLevelPercent / 100);
  return {
    nativeWidth: dims.width,
    nativeHeight: dims.height,
    baseScale,
    displayScale,
    layoutWidth: dims.width * displayScale,
    layoutHeight: dims.height * displayScale,
  };
}

export function fitZoomLevelForContainer(
  format: CalendarCanvasFormat,
  containerWidth: number,
  containerHeight: number,
  padding = 48
): number {
  const layout = calendarPreviewLayout(format, 100);
  const availableWidth = Math.max(120, containerWidth - padding);
  const availableHeight = Math.max(120, containerHeight - padding);
  const baseW = layout.nativeWidth * layout.baseScale;
  const baseH = layout.nativeHeight * layout.baseScale;
  const fit = Math.min(availableWidth / baseW, availableHeight / baseH) * 100;
  return Math.max(25, Math.min(200, Math.round(fit / 5) * 5));
}

export function calendarCanvasAspectRatio(format: CalendarCanvasFormat): string {
  const dims = CALENDAR_CANVAS_DIMENSIONS[format];
  return `${dims.width} / ${dims.height}`;
}

export function calendarFormatToAspectPreset(format: CalendarCanvasFormat): string {
  if (format === 'portrait') return 'instagram-story';
  if (format === 'landscape') return 'landscape';
  return 'instagram-post';
}

export function normalizeCalendarCanvasFrame(
  frame: CalendarCanvasFrameStyles | undefined,
  brandColor?: string
): CalendarCanvasFrameStyles {
  if (!frame) return createDefaultCanvasFrame('square', brandColor);
  const format = frame.format ?? 'square';
  return {
    format,
    padding: typeof frame.padding === 'number' ? frame.padding : FRAME_DEFAULTS[format].padding,
    calendarScale:
      typeof frame.calendarScale === 'number'
        ? frame.calendarScale
        : FRAME_DEFAULTS[format].calendarScale,
    background: frame.background ?? canvasFrameBackgroundForFormat(format, brandColor),
  };
}
