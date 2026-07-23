import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  canvasFrameDefaultsForFormat,
  canvasFrameBackgroundForFormat,
  type CalendarCanvasFormat,
} from '@/features/dashboard/marketing/lib/calendarCanvasFormats';
import { applyBrandAccentToCalendarStyles } from '@/features/dashboard/marketing/lib/calendarBrandColors';

import {
  type CalendarStyles,
  type CalendarBuilderState,
  type PreviewBooking,
  createDefaultStyles,
  normalizeCalendarStyles,
} from '../types';

// ========================================
// Store Actions Interface
// ========================================
interface CalendarBuilderActions {
  // Style updates
  setStyles: (styles: CalendarStyles) => void;
  updateStyles: (path: string, value: unknown) => void;
  resetStyles: (brandColor?: string) => void;

  // Section navigation
  setActiveSection: (section: string | null) => void;
  setActiveSubSection: (subSection: string | null) => void;

  // Preview controls
  setPreviewMonth: (date: Date) => void;
  nextMonth: () => void;
  prevMonth: () => void;

  // Export controls
  setExportFormat: (format: 'png' | 'jpeg' | 'webp') => void;
  setExportQuality: (quality: number) => void;
  setIsExporting: (isExporting: boolean) => void;

  // History (undo/redo)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;

  // Presets
  applyPreset: (preset: string, brandColor?: string) => void;

  // Dirty state
  setIsDirty: (isDirty: boolean) => void;
}

// ========================================
// Combined Store Type
// ========================================
type CalendarBuilderStore = CalendarBuilderState & CalendarBuilderActions;

// ========================================
// Helper: Deep set value by path
// ========================================
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!key) continue;
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey) {
    current[lastKey] = value;
  }
}

// ========================================
// Preset Styles — 10 production-ready designer templates
// Each template has a distinct font pairing, palette, and visual language.
// Navigation arrows + legend are hidden by default (see createDefaultStyles).
// Fonts are loaded via Google Fonts in ui/index.html.
// ========================================
const presets: Record<string, Partial<CalendarStyles>> = {
  // ----------------------------------------
  // EDITORIAL SERIF — Playfair Display + Inter (magazine quality, boutique hotel)
  // ----------------------------------------
  'editorial-serif': {
    container: {
      ...createDefaultStyles().container,
      background: { type: 'solid', color: '#ffffff' },
      border: { width: 1, style: 'solid', color: '#e5e7eb', radius: 4 },
      shadow: {
        enabled: true,
        x: 0,
        y: 12,
        blur: 48,
        spread: -16,
        color: 'rgba(17, 24, 39, 0.10)',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 4,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 24, left: 0 },
      border: { width: 0, style: 'solid', color: '#e5e7eb', radius: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#94a3b8',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Inter',
          weight: 500,
          size: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#111827',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Playfair Display',
          weight: 700,
          size: 34,
          lineHeight: 1.1,
          letterSpacing: -0.5,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'transparent' },
      color: '#6b7280',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Inter',
        weight: 600,
        size: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      },
      padding: { top: 14, right: 4, bottom: 14, left: 4 },
      border: { width: 0, style: 'solid', color: '#e5e7eb', radius: 0 },
    },
    grid: {
      ...createDefaultStyles().grid,
      gap: 10,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 112,
      padding: { top: 10, right: 12, bottom: 10, left: 12 },
      border: { width: 1, style: 'solid', color: '#f3f4f6', radius: 2 },
      borderRadius: 2,
      background: { type: 'solid', color: 'transparent' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Inter',
          weight: 400,
          size: 14,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#374151',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: '#f9fafb',
        borderColor: '#e5e7eb',
        scale: 1,
      },
      empty: { background: { type: 'solid', color: 'transparent' }, opacity: 0.3 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: 'transparent' },
      border: { width: 2, style: 'solid', color: '#111827', radius: 2 },
      dayNumberColor: '#111827',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#111827', size: 4 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: { type: 'solid', color: '#1f2937' },
      dayNumberColor: '#ffffff',
      border: { width: 0, style: 'none', color: 'transparent', radius: 2 },
      text: {
        ...createDefaultStyles().booked.text,
        show: true,
        content: 'BOOKED',
        color: 'rgba(255,255,255,0.85)',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Inter',
          weight: 600,
          size: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: false,
        type: 'icon',
        value: 'check',
        size: 22,
        color: '#ffffff',
        position: 'center',
        opacity: 0.9,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: 'transparent' },
      dayNumberColor: '#374151',
      border: { width: 1, style: 'solid', color: '#f3f4f6', radius: 2 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: '#f9fafb' },
      dayNumberColor: '#cbd5e1',
      border: { width: 1, style: 'solid', color: '#f3f4f6', radius: 2 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#cbd5e1',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Inter', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#e5e7eb', opacity: 0.7 },
    },
  },

  // ----------------------------------------
  // MODERN CLASSIC — Cormorant Garamond + Jost (refined, warm cream)
  // ----------------------------------------
  'modern-classic': {
    container: {
      ...createDefaultStyles().container,
      background: { type: 'solid', color: '#faf7f2' },
      border: { width: 1, style: 'solid', color: '#e7dccc', radius: 10 },
      shadow: {
        enabled: true,
        x: 0,
        y: 14,
        blur: 44,
        spread: -12,
        color: 'rgba(122, 88, 56, 0.12)',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 10,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 26, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#a8896c',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Jost',
          weight: 400,
          size: 11,
          letterSpacing: 3,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#3d2c1e',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Cormorant Garamond',
          weight: 500,
          size: 38,
          lineHeight: 1.1,
          letterSpacing: -0.3,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'transparent' },
      color: '#8b7355',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Jost',
        weight: 500,
        size: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
      },
      padding: { top: 12, right: 4, bottom: 12, left: 4 },
      border: { width: 0, style: 'solid', color: '#e7dccc', radius: 0 },
    },
    grid: { ...createDefaultStyles().grid, gap: 10 },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 108,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      border: { width: 1, style: 'solid', color: '#ede4d3', radius: 6 },
      borderRadius: 6,
      background: { type: 'solid', color: '#fffdf9' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Jost',
          weight: 400,
          size: 14,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#5c4a36',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: '#fbf6ee',
        borderColor: '#d6c4a8',
        scale: 1,
      },
      empty: { background: { type: 'solid', color: 'transparent' }, opacity: 0.3 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: '#f5ebe0' },
      border: { width: 1, style: 'solid', color: '#c2410c', radius: 6 },
      dayNumberColor: '#c2410c',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#c2410c', size: 4 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: {
        type: 'gradient',
        color: '#9a3412',
        gradient: {
          type: 'linear',
          angle: 150,
          stops: [
            { color: '#9a3412', position: 0 },
            { color: '#7c2d12', position: 100 },
          ],
        },
      },
      dayNumberColor: '#fef3c7',
      border: { width: 0, style: 'none', color: 'transparent', radius: 6 },
      text: {
        ...createDefaultStyles().booked.text,
        show: true,
        content: 'BOOKED',
        color: 'rgba(254,243,199,0.9)',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Cormorant Garamond',
          weight: 600,
          size: 11,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: false,
        type: 'icon',
        value: 'check',
        size: 22,
        color: '#fef3c7',
        position: 'center',
        opacity: 0.9,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: '#fffdf9' },
      dayNumberColor: '#5c4a36',
      border: { width: 1, style: 'solid', color: '#ede4d3', radius: 6 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: '#f5ebe0' },
      dayNumberColor: '#c2a888',
      border: { width: 1, style: 'solid', color: '#ede4d3', radius: 6 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#c2a888',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Jost', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#d6c4a8', opacity: 0.5 },
    },
  },

  // ----------------------------------------
  // SWISS MINIMAL — Inter Tight (pure white, hairline, monochrome grid)
  // ----------------------------------------
  'swiss-minimal': {
    container: {
      ...createDefaultStyles().container,
      background: { type: 'solid', color: '#ffffff' },
      border: { width: 1, style: 'solid', color: '#000000', radius: 0 },
      shadow: {
        enabled: false,
        x: 0,
        y: 0,
        blur: 0,
        spread: 0,
        color: 'transparent',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 0,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 22, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#000000',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Inter Tight',
          weight: 400,
          size: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#000000',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Inter Tight',
          weight: 600,
          size: 24,
          lineHeight: 1.2,
          letterSpacing: -0.4,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'transparent' },
      color: '#000000',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Inter Tight',
        weight: 500,
        size: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
      },
      padding: { top: 12, right: 4, bottom: 12, left: 4 },
      border: { width: 1, style: 'solid', color: '#000000', radius: 0 },
    },
    grid: {
      ...createDefaultStyles().grid,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 104,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      border: { width: 1, style: 'solid', color: '#e5e5e5', radius: 0 },
      borderRadius: 0,
      background: { type: 'solid', color: 'transparent' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Inter Tight',
          weight: 400,
          size: 13,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#171717',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: '#fafafa',
        borderColor: '#000000',
        scale: 1,
      },
      empty: { background: { type: 'solid', color: '#fafafa' }, opacity: 0.5 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: 'transparent' },
      border: { width: 1.5, style: 'solid', color: '#000000', radius: 0 },
      dayNumberColor: '#000000',
      dayNumberBackground: 'transparent',
      indicator: { show: false, type: 'dot', color: '#000000', size: 4 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: { type: 'solid', color: '#f5f5f5' },
      dayNumberColor: '#a3a3a3',
      border: { width: 1, style: 'solid', color: '#e5e5e5', radius: 0 },
      text: {
        ...createDefaultStyles().booked.text,
        show: false,
        content: 'BOOKED',
        color: '#a3a3a3',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Inter Tight',
          weight: 500,
          size: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: false,
        type: 'icon',
        value: 'check',
        size: 20,
        color: '#a3a3a3',
        position: 'center',
        opacity: 0.8,
      },
      pattern: { show: true, type: 'diagonal', color: '#d4d4d4', opacity: 0.7, size: 8 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: 'transparent' },
      dayNumberColor: '#171717',
      border: { width: 1, style: 'solid', color: '#e5e5e5', radius: 0 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: '#fafafa' },
      dayNumberColor: '#d4d4d4',
      border: { width: 1, style: 'solid', color: '#e5e5e5', radius: 0 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#d4d4d4',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Inter Tight', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#e5e5e5', opacity: 0.8 },
    },
  },

  // ----------------------------------------
  // MONO INK — Space Grotesk (off-white, high contrast black ink, bold geometric)
  // ----------------------------------------
  'mono-ink': {
    container: {
      ...createDefaultStyles().container,
      background: { type: 'solid', color: '#fafafa' },
      border: { width: 1, style: 'solid', color: '#171717', radius: 6 },
      shadow: {
        enabled: false,
        x: 0,
        y: 0,
        blur: 0,
        spread: 0,
        color: 'transparent',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 6,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 20, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#171717',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Space Grotesk',
          weight: 500,
          size: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#171717',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Space Grotesk',
          weight: 700,
          size: 28,
          lineHeight: 1.1,
          letterSpacing: -0.5,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'transparent' },
      color: '#171717',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Space Grotesk',
        weight: 700,
        size: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
      },
      padding: { top: 10, right: 4, bottom: 10, left: 4 },
      border: { width: 2, style: 'solid', color: '#171717', radius: 0 },
    },
    grid: { ...createDefaultStyles().grid, gap: 8 },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 104,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 4 },
      borderRadius: 4,
      background: { type: 'solid', color: '#ffffff' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Space Grotesk',
          weight: 600,
          size: 16,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#171717',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: '#171717',
        borderColor: '#171717',
        scale: 1,
      },
      empty: { background: { type: 'solid', color: '#f5f5f5' }, opacity: 0.6 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: '#171717' },
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 4 },
      dayNumberColor: '#ffffff',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#ffffff', size: 5 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: { type: 'solid', color: '#171717' },
      dayNumberColor: '#ffffff',
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 4 },
      text: {
        ...createDefaultStyles().booked.text,
        show: false,
        content: 'BOOKED',
        color: '#ffffff',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Space Grotesk',
          weight: 700,
          size: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: false,
        type: 'icon',
        value: 'check',
        size: 22,
        color: '#ffffff',
        position: 'center',
        opacity: 0.95,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: '#ffffff' },
      dayNumberColor: '#171717',
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 4 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: '#f5f5f5' },
      dayNumberColor: '#a3a3a3',
      border: { width: 1.5, style: 'solid', color: '#d4d4d4', radius: 4 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#a3a3a3',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Space Grotesk', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#171717', opacity: 0.15 },
    },
  },

  // ----------------------------------------
  // TERRACOTTA — Fraunces + DM Sans (warm sand, organic curves, boutique stay)
  // ----------------------------------------
  terracotta: {
    container: {
      ...createDefaultStyles().container,
      background: {
        type: 'gradient',
        color: '#f5ebe0',
        gradient: {
          type: 'linear',
          angle: 165,
          stops: [
            { color: '#f7efe5', position: 0 },
            { color: '#f0e0d0', position: 100 },
          ],
        },
      },
      border: { width: 0, style: 'none', color: 'transparent', radius: 24 },
      shadow: {
        enabled: true,
        x: 0,
        y: 16,
        blur: 48,
        spread: -12,
        color: 'rgba(154, 82, 52, 0.18)',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 24,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 24, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#9a3412',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'DM Sans',
          weight: 500,
          size: 12,
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#7c2d12',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Fraunces',
          weight: 600,
          size: 32,
          lineHeight: 1.1,
          letterSpacing: -0.3,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'transparent' },
      color: '#c2410c',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'DM Sans',
        weight: 600,
        size: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      },
      padding: { top: 12, right: 4, bottom: 12, left: 4 },
      border: { width: 0, style: 'solid', color: 'transparent', radius: 0 },
    },
    grid: { ...createDefaultStyles().grid, gap: 10 },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 108,
      padding: { top: 10, right: 12, bottom: 10, left: 12 },
      border: { width: 0, style: 'none', color: 'transparent', radius: 16 },
      borderRadius: 16,
      background: { type: 'solid', color: '#fffaf5' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'DM Sans',
          weight: 500,
          size: 14,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#7c2d12',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: '#fff5ec',
        borderColor: 'transparent',
        scale: 1.02,
      },
      empty: { background: { type: 'solid', color: 'transparent' }, opacity: 0.3 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: '#c2410c' },
      border: { width: 0, style: 'none', color: 'transparent', radius: 16 },
      dayNumberColor: '#fff7ed',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#fff7ed', size: 5 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: {
        type: 'gradient',
        color: '#c2410c',
        gradient: {
          type: 'linear',
          angle: 150,
          stops: [
            { color: '#c2410c', position: 0 },
            { color: '#9a3412', position: 100 },
          ],
        },
      },
      dayNumberColor: '#fff7ed',
      border: { width: 0, style: 'none', color: 'transparent', radius: 16 },
      text: {
        ...createDefaultStyles().booked.text,
        show: false,
        content: 'BOOKED',
        color: 'rgba(255,247,237,0.92)',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Fraunces',
          weight: 600,
          size: 10,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: false,
        type: 'icon',
        value: 'check',
        size: 22,
        color: '#fff7ed',
        position: 'center',
        opacity: 0.95,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: '#fffaf5' },
      dayNumberColor: '#7c2d12',
      border: { width: 0, style: 'none', color: 'transparent', radius: 16 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: '#ede0d4' },
      dayNumberColor: '#c2a888',
      border: { width: 0, style: 'none', color: 'transparent', radius: 16 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#c2a888',
        font: { ...createDefaultStyles().blocked.text.font, family: 'DM Sans', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#d6b89e', opacity: 0.5 },
    },
  },

  // ----------------------------------------
  // TROPICAL PARADISE — Plus Jakarta Sans + beach photo background, frosted border cells
  // ----------------------------------------
  'tropical-paradise': {
    container: {
      ...createDefaultStyles().container,
      background: {
        type: 'image',
        color: '#ffffff',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
        imageSize: 'cover',
        imagePosition: 'center',
        overlay: 'rgba(255, 255, 255, 0.88)',
        opacity: 1,
      },
      border: { width: 0, style: 'none', color: 'transparent', radius: 20 },
      shadow: {
        enabled: true,
        x: 0,
        y: 12,
        blur: 40,
        spread: -8,
        color: 'rgba(0, 137, 123, 0.22)',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 20,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 22, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#00897b',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Plus Jakarta Sans',
          weight: 600,
          size: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#004d40',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Plus Jakarta Sans',
          weight: 700,
          size: 28,
          lineHeight: 1.1,
          letterSpacing: -0.3,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'rgba(255,255,255,0.75)' },
      color: '#00695c',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Plus Jakarta Sans',
        weight: 600,
        size: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      },
      padding: { top: 10, right: 4, bottom: 10, left: 4 },
      border: { width: 0, style: 'none', color: 'transparent', radius: 10 },
    },
    grid: { ...createDefaultStyles().grid, gap: 10 },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 96,
      padding: { top: 8, right: 10, bottom: 8, left: 10 },
      border: { width: 1, style: 'solid', color: 'rgba(255,255,255,0.9)', radius: 12 },
      borderRadius: 12,
      background: { type: 'solid', color: 'rgba(255,255,255,0.92)' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Plus Jakarta Sans',
          weight: 600,
          size: 14,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#004d40',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: 'rgba(255,255,255,0.98)',
        borderColor: '#80cbc4',
        scale: 1.02,
      },
      empty: { background: { type: 'solid', color: 'rgba(178, 223, 219, 0.25)' }, opacity: 0.5 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: '#00897b' },
      border: { width: 0, style: 'none', color: 'transparent', radius: 12 },
      dayNumberColor: '#ffffff',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#ffffff', size: 5 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: {
        type: 'gradient',
        color: '#26a69a',
        gradient: {
          type: 'linear',
          angle: 135,
          stops: [
            { color: '#4db6ac', position: 0 },
            { color: '#00897b', position: 100 },
          ],
        },
      },
      dayNumberColor: '#ffffff',
      border: { width: 0, style: 'none', color: 'transparent', radius: 12 },
      text: {
        ...createDefaultStyles().booked.text,
        show: false,
        content: 'BOOKED',
        color: 'rgba(255,255,255,0.92)',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Plus Jakarta Sans',
          weight: 600,
          size: 9,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: true,
        type: 'icon',
        value: 'house',
        size: 24,
        color: '#ffffff',
        position: 'center',
        opacity: 0.92,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: 'rgba(255,255,255,0.92)' },
      dayNumberColor: '#004d40',
      border: { width: 1, style: 'solid', color: 'rgba(255,255,255,0.9)', radius: 12 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: 'rgba(178, 223, 219, 0.45)' },
      dayNumberColor: '#4db6ac',
      border: { width: 1, style: 'solid', color: 'rgba(255,255,255,0.7)', radius: 12 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#4db6ac',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Plus Jakarta Sans', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#80cbc4', opacity: 0.4 },
    },
  },

  // ----------------------------------------
  // ONYX LUXE — Outfit (deep charcoal + gold accent, sophisticated dark)
  // ----------------------------------------
  'onyx-luxe': {
    container: {
      ...createDefaultStyles().container,
      background: { type: 'solid', color: '#0a0a0a' },
      border: { width: 1, style: 'solid', color: '#1f1f1f', radius: 16 },
      shadow: {
        enabled: true,
        x: 0,
        y: 20,
        blur: 60,
        spread: -16,
        color: 'rgba(0, 0, 0, 0.6)',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 16,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 24, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#d4af37',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Outfit',
          weight: 500,
          size: 11,
          letterSpacing: 3,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#f5f5f5',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Outfit',
          weight: 600,
          size: 28,
          lineHeight: 1.1,
          letterSpacing: -0.3,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'transparent' },
      color: '#a3a3a3',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Outfit',
        weight: 600,
        size: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
      },
      padding: { top: 12, right: 4, bottom: 12, left: 4 },
      border: { width: 1, style: 'solid', color: '#1f1f1f', radius: 0 },
    },
    grid: { ...createDefaultStyles().grid, gap: 10 },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 108,
      padding: { top: 10, right: 12, bottom: 10, left: 12 },
      border: { width: 1, style: 'solid', color: '#262626', radius: 10 },
      borderRadius: 10,
      background: { type: 'solid', color: '#171717' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Outfit',
          weight: 500,
          size: 14,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#e5e5e5',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: '#1f1f1f',
        borderColor: '#404040',
        scale: 1.02,
      },
      empty: { background: { type: 'solid', color: '#0f0f0f' }, opacity: 0.5 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: 'transparent' },
      border: { width: 2, style: 'solid', color: '#d4af37', radius: 10 },
      dayNumberColor: '#d4af37',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#d4af37', size: 5 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: { type: 'solid', color: '#d4af37' },
      dayNumberColor: '#0a0a0a',
      border: { width: 0, style: 'none', color: 'transparent', radius: 10 },
      text: {
        ...createDefaultStyles().booked.text,
        show: false,
        content: 'BOOKED',
        color: 'rgba(10,10,10,0.85)',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Outfit',
          weight: 700,
          size: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: false,
        type: 'icon',
        value: 'check',
        size: 22,
        color: '#0a0a0a',
        position: 'center',
        opacity: 0.9,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: '#171717' },
      dayNumberColor: '#e5e5e5',
      border: { width: 1, style: 'solid', color: '#262626', radius: 10 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: '#0f0f0f' },
      dayNumberColor: '#525252',
      border: { width: 1, style: 'solid', color: '#262626', radius: 10 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#525252',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Outfit', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#262626', opacity: 0.8 },
    },
  },

  // ----------------------------------------
  // MIDNIGHT VELVET — Manrope (deep navy → indigo gradient, premium dark)
  // ----------------------------------------
  'midnight-velvet': {
    container: {
      ...createDefaultStyles().container,
      background: {
        type: 'gradient',
        color: '#0f172a',
        gradient: {
          type: 'linear',
          angle: 160,
          stops: [
            { color: '#0f172a', position: 0 },
            { color: '#1e1b4b', position: 100 },
          ],
        },
      },
      border: { width: 1, style: 'solid', color: '#312e81', radius: 24 },
      shadow: {
        enabled: true,
        x: 0,
        y: 20,
        blur: 60,
        spread: -16,
        color: 'rgba(49, 46, 129, 0.45)',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 24,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 24, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#818cf8',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Manrope',
          weight: 500,
          size: 12,
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#f1f5f9',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Manrope',
          weight: 700,
          size: 28,
          lineHeight: 1.1,
          letterSpacing: -0.3,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'transparent' },
      color: '#a5b4fc',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Manrope',
        weight: 600,
        size: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      },
      padding: { top: 12, right: 4, bottom: 12, left: 4 },
      border: { width: 1, style: 'solid', color: '#312e81', radius: 0 },
    },
    grid: { ...createDefaultStyles().grid, gap: 10 },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 108,
      padding: { top: 10, right: 12, bottom: 10, left: 12 },
      border: { width: 1, style: 'solid', color: '#312e81', radius: 12 },
      borderRadius: 12,
      background: { type: 'solid', color: 'rgba(30, 27, 75, 0.6)' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Manrope',
          weight: 500,
          size: 14,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#c7d2fe',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: 'rgba(49, 46, 129, 0.7)',
        borderColor: '#4f46e5',
        scale: 1.02,
      },
      empty: { background: { type: 'solid', color: 'rgba(15, 23, 42, 0.4)' }, opacity: 0.5 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: '#6366f1' },
      border: { width: 0, style: 'none', color: 'transparent', radius: 12 },
      dayNumberColor: '#ffffff',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#ffffff', size: 5 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: {
        type: 'gradient',
        color: '#6366f1',
        gradient: {
          type: 'linear',
          angle: 150,
          stops: [
            { color: '#6366f1', position: 0 },
            { color: '#4f46e5', position: 100 },
          ],
        },
      },
      dayNumberColor: '#ffffff',
      border: { width: 0, style: 'none', color: 'transparent', radius: 12 },
      text: {
        ...createDefaultStyles().booked.text,
        show: false,
        content: 'BOOKED',
        color: 'rgba(255,255,255,0.92)',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Manrope',
          weight: 600,
          size: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: false,
        type: 'icon',
        value: 'check',
        size: 22,
        color: '#ffffff',
        position: 'center',
        opacity: 0.95,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: 'rgba(30, 27, 75, 0.6)' },
      dayNumberColor: '#c7d2fe',
      border: { width: 1, style: 'solid', color: '#312e81', radius: 12 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: 'rgba(15, 23, 42, 0.5)' },
      dayNumberColor: '#6366f1',
      border: { width: 1, style: 'solid', color: '#312e81', radius: 12 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#6366f1',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Manrope', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#312e81', opacity: 0.6 },
    },
  },

  // ----------------------------------------
  // RISOGRAPH POP — Space Grotesk (bold geometric, coral + blue, sharp)
  // ----------------------------------------
  'risograph-pop': {
    container: {
      ...createDefaultStyles().container,
      background: { type: 'solid', color: '#fef9f5' },
      border: { width: 2, style: 'solid', color: '#171717', radius: 0 },
      shadow: {
        enabled: true,
        x: 8,
        y: 8,
        blur: 0,
        spread: 0,
        color: 'rgba(244, 63, 94, 0.25)',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 0,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 20, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#2563eb',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Space Grotesk',
          weight: 700,
          size: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#171717',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Space Grotesk',
          weight: 700,
          size: 30,
          lineHeight: 1.05,
          letterSpacing: -0.5,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: '#171717' },
      color: '#fef9f5',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Space Grotesk',
        weight: 700,
        size: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
      },
      padding: { top: 8, right: 4, bottom: 8, left: 4 },
      border: { width: 2, style: 'solid', color: '#171717', radius: 0 },
    },
    grid: { ...createDefaultStyles().grid, gap: 6 },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 100,
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 0 },
      borderRadius: 0,
      background: { type: 'solid', color: '#ffffff' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Space Grotesk',
          weight: 700,
          size: 16,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#171717',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: '#fef3c7',
        borderColor: '#171717',
        scale: 1,
      },
      empty: { background: { type: 'solid', color: '#fef9f5' }, opacity: 0.5 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: '#2563eb' },
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 0 },
      dayNumberColor: '#ffffff',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#ffffff', size: 5 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: { type: 'solid', color: '#f43f5e' },
      dayNumberColor: '#ffffff',
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 0 },
      text: {
        ...createDefaultStyles().booked.text,
        show: false,
        content: 'BOOKED',
        color: '#ffffff',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Space Grotesk',
          weight: 700,
          size: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: false,
        type: 'icon',
        value: 'check',
        size: 22,
        color: '#ffffff',
        position: 'center',
        opacity: 0.95,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: '#ffffff' },
      dayNumberColor: '#171717',
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 0 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: '#fef3c7' },
      dayNumberColor: '#a16207',
      border: { width: 1.5, style: 'solid', color: '#171717', radius: 0 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#a16207',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Space Grotesk', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#171717', opacity: 0.2 },
    },
  },

  // ----------------------------------------
  // COZY CABIN — Outfit + wood texture photo background, warm bordered cells
  // ----------------------------------------
  'cozy-cabin': {
    container: {
      ...createDefaultStyles().container,
      background: {
        type: 'image',
        color: '#faf5f0',
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
        imageSize: 'cover',
        imagePosition: 'center',
        overlay: 'rgba(250, 245, 240, 0.90)',
        opacity: 1,
      },
      border: { width: 0, style: 'none', color: 'transparent', radius: 20 },
      shadow: {
        enabled: true,
        x: 0,
        y: 12,
        blur: 40,
        spread: -8,
        color: 'rgba(93, 64, 55, 0.18)',
        inset: false,
      },
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      maxWidth: 900,
      borderRadius: 20,
    },
    header: {
      ...createDefaultStyles().header,
      padding: { top: 0, right: 0, bottom: 22, left: 0 },
      propertyName: {
        ...createDefaultStyles().header.propertyName,
        color: '#8d6e63',
        font: {
          ...createDefaultStyles().header.propertyName.font,
          family: 'Outfit',
          weight: 500,
          size: 11,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
        },
      },
      monthYear: {
        ...createDefaultStyles().header.monthYear,
        color: '#5d4037',
        font: {
          ...createDefaultStyles().header.monthYear.font,
          family: 'Outfit',
          weight: 600,
          size: 28,
          lineHeight: 1.1,
          letterSpacing: -0.2,
          textTransform: 'none',
        },
      },
    },
    dayNames: {
      ...createDefaultStyles().dayNames,
      background: { type: 'solid', color: 'rgba(255,255,255,0.72)' },
      color: '#6d4c41',
      font: {
        ...createDefaultStyles().dayNames.font,
        family: 'Outfit',
        weight: 500,
        size: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      },
      padding: { top: 10, right: 4, bottom: 10, left: 4 },
      border: { width: 0, style: 'none', color: 'transparent', radius: 10 },
    },
    grid: { ...createDefaultStyles().grid, gap: 10 },
    cell: {
      ...createDefaultStyles().cell,
      minHeight: 96,
      padding: { top: 8, right: 10, bottom: 8, left: 10 },
      border: { width: 1, style: 'solid', color: 'rgba(255,255,255,0.85)', radius: 12 },
      borderRadius: 12,
      background: { type: 'solid', color: 'rgba(255,255,255,0.88)' },
      dayNumber: {
        ...createDefaultStyles().cell.dayNumber,
        font: {
          ...createDefaultStyles().cell.dayNumber.font,
          family: 'Outfit',
          weight: 500,
          size: 14,
          letterSpacing: 0,
          textTransform: 'none',
        },
        color: '#5d4037',
        position: 'top-left',
      },
      hover: {
        ...createDefaultStyles().cell.hover,
        background: 'rgba(255,255,255,0.96)',
        borderColor: '#bcaaa4',
        scale: 1.02,
      },
      empty: { background: { type: 'solid', color: 'rgba(215, 189, 167, 0.28)' }, opacity: 0.5 },
    },
    today: {
      ...createDefaultStyles().today,
      background: { type: 'solid', color: '#8d6e63' },
      border: { width: 0, style: 'none', color: 'transparent', radius: 12 },
      dayNumberColor: '#ffffff',
      dayNumberBackground: 'transparent',
      indicator: { show: true, type: 'dot', color: '#ffffff', size: 5 },
    },
    booked: {
      ...createDefaultStyles().booked,
      background: {
        type: 'gradient',
        color: '#8d6e63',
        gradient: {
          type: 'linear',
          angle: 135,
          stops: [
            { color: '#a1887f', position: 0 },
            { color: '#6d4c41', position: 100 },
          ],
        },
      },
      dayNumberColor: '#ffffff',
      border: { width: 0, style: 'none', color: 'transparent', radius: 12 },
      text: {
        ...createDefaultStyles().booked.text,
        show: false,
        content: 'BOOKED',
        color: 'rgba(255,255,255,0.92)',
        font: {
          ...createDefaultStyles().booked.text.font,
          family: 'Outfit',
          weight: 600,
          size: 9,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        position: 'bottom',
      },
      icon: {
        show: true,
        type: 'icon',
        value: 'bed',
        size: 24,
        color: '#ffffff',
        position: 'center',
        opacity: 0.92,
      },
      pattern: { show: false, type: 'none', color: '#ffffff', opacity: 0.1, size: 10 },
    },
    available: {
      ...createDefaultStyles().available,
      background: { type: 'solid', color: 'rgba(255,255,255,0.88)' },
      dayNumberColor: '#5d4037',
      border: { width: 1, style: 'solid', color: 'rgba(255,255,255,0.85)', radius: 12 },
    },
    blocked: {
      ...createDefaultStyles().blocked,
      background: { type: 'solid', color: 'rgba(215, 189, 167, 0.45)' },
      dayNumberColor: '#a1887f',
      border: { width: 1, style: 'solid', color: 'rgba(255,255,255,0.7)', radius: 12 },
      text: {
        ...createDefaultStyles().blocked.text,
        show: false,
        content: 'N/A',
        color: '#a1887f',
        font: { ...createDefaultStyles().blocked.text.font, family: 'Outfit', size: 9 },
      },
      pattern: { show: true, type: 'diagonal', color: '#bcaaa4', opacity: 0.4 },
    },
  },

  // Blank / default (used by the "Blank calendar" sidebar card)
  default: {
    ...createDefaultStyles(),
  },
};

// ========================================
// Mock Preview Data
// ========================================
export const MOCK_PREVIEW_BOOKINGS: PreviewBooking[] = [
  { id: '1', guestName: 'John Smith', startDay: 5, endDay: 8, status: 'confirmed' },
  { id: '2', guestName: 'Sarah Johnson', startDay: 12, endDay: 14, status: 'checkedIn' },
  { id: '3', guestName: 'Mike Williams', startDay: 20, endDay: 25, status: 'pending' },
];

export const MOCK_BLOCKED_DAYS = [1, 2, 28, 29, 30];

export function resolveCalendarPresetStyles(preset: string): CalendarStyles {
  if (preset === 'default') {
    return createDefaultStyles();
  }

  const presetStyles = presets[preset];
  if (!presetStyles) {
    return createDefaultStyles();
  }

  const defaultStyles = createDefaultStyles();
  return normalizeCalendarStyles({
    ...defaultStyles,
    ...presetStyles,
    container: { ...defaultStyles.container, ...presetStyles.container },
    header: { ...defaultStyles.header, ...presetStyles.header },
    dayNames: { ...defaultStyles.dayNames, ...presetStyles.dayNames },
    grid: { ...defaultStyles.grid, ...presetStyles.grid },
    cell: { ...defaultStyles.cell, ...presetStyles.cell },
    today: { ...defaultStyles.today, ...presetStyles.today },
    booked: { ...defaultStyles.booked, ...presetStyles.booked },
    available: { ...defaultStyles.available, ...presetStyles.available },
    blocked: { ...defaultStyles.blocked, ...presetStyles.blocked },
    bookingBar: { ...defaultStyles.bookingBar, ...presetStyles.bookingBar },
    legend: { ...defaultStyles.legend, ...presetStyles.legend },
    watermark: { ...defaultStyles.watermark, ...presetStyles.watermark },
  } as CalendarStyles);
}

/** Preset styles with canvas frame matched to the active export format (sidebar thumbnails). */
export function resolveCalendarPresetStylesForFormat(
  preset: string,
  format: CalendarCanvasFormat,
  brandColor?: string
): CalendarStyles {
  const styles = resolveCalendarPresetStyles(preset);
  const defaults = canvasFrameDefaultsForFormat(format, brandColor);
  return applyBrandAccentToCalendarStyles(
    normalizeCalendarStyles({
      ...styles,
      canvasFrame: {
        format,
        padding: defaults.padding,
        calendarScale: defaults.calendarScale,
        background: defaults.background,
      },
    }),
    brandColor
  );
}

// ========================================
// Create Store
// ========================================
export const useCalendarBuilderStore = create<CalendarBuilderStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      styles: createDefaultStyles(),
      activeSection: null,
      activeSubSection: null,
      previewMonth: new Date(),
      isDirty: false,
      isExporting: false,
      exportFormat: 'png',
      exportQuality: 1,
      history: [createDefaultStyles()],
      historyIndex: 0,

      // Actions
      setStyles: (styles) =>
        set((state) => {
          state.styles = normalizeCalendarStyles(styles);
          state.isDirty = true;
        }),

      updateStyles: (path, value) =>
        set((state) => {
          setNestedValue(state.styles as unknown as Record<string, unknown>, path, value);
          state.isDirty = true;
        }),

      resetStyles: (brandColor) =>
        set((state) => {
          const next = applyBrandAccentToCalendarStyles(
            createDefaultStyles(brandColor),
            brandColor
          );
          state.styles = next;
          state.isDirty = false;
          state.history = [next];
          state.historyIndex = 0;
        }),

      setActiveSection: (section) =>
        set((state) => {
          state.activeSection = section;
          state.activeSubSection = null;
        }),

      setActiveSubSection: (subSection) =>
        set((state) => {
          state.activeSubSection = subSection;
        }),

      setPreviewMonth: (date) =>
        set((state) => {
          state.previewMonth = date;
        }),

      nextMonth: () =>
        set((state) => {
          const current = new Date(state.previewMonth);
          current.setMonth(current.getMonth() + 1);
          state.previewMonth = current;
        }),

      prevMonth: () =>
        set((state) => {
          const current = new Date(state.previewMonth);
          current.setMonth(current.getMonth() - 1);
          state.previewMonth = current;
        }),

      setExportFormat: (format) =>
        set((state) => {
          state.exportFormat = format;
        }),

      setExportQuality: (quality) =>
        set((state) => {
          state.exportQuality = quality;
        }),

      setIsExporting: (isExporting) =>
        set((state) => {
          state.isExporting = isExporting;
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex > 0) {
            state.historyIndex -= 1;
            const previousStyles = state.history[state.historyIndex];
            if (previousStyles) {
              state.styles = previousStyles;
              state.isDirty = true;
            }
          }
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex += 1;
            const nextStyles = state.history[state.historyIndex];
            if (nextStyles) {
              state.styles = nextStyles;
              state.isDirty = true;
            }
          }
        }),

      canUndo: () => {
        const { historyIndex } = get();
        return historyIndex > 0;
      },

      canRedo: () => {
        const { historyIndex, history } = get();
        return historyIndex < history.length - 1;
      },

      saveToHistory: () =>
        set((state) => {
          // Remove any future history if we're not at the end
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(JSON.parse(JSON.stringify(state.styles)));

          // Limit history to 50 entries
          if (newHistory.length > 50) {
            newHistory.shift();
          }

          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
        }),

      applyPreset: (preset, brandColor) =>
        set((state) => {
          const preservedFrame = state.styles.canvasFrame;
          if (preset === 'default') {
            state.styles = applyBrandAccentToCalendarStyles(
              createDefaultStyles(brandColor),
              brandColor
            );
            state.isDirty = false;
            return;
          }

          state.styles = applyBrandAccentToCalendarStyles(
            resolveCalendarPresetStyles(preset),
            brandColor
          );
          if (preservedFrame) {
            const format = preservedFrame.format ?? 'square';
            state.styles.canvasFrame = {
              ...preservedFrame,
              background:
                format === 'square'
                  ? preservedFrame.background
                  : canvasFrameBackgroundForFormat(format, brandColor),
            };
          }
          state.isDirty = true;
        }),

      setIsDirty: (isDirty) =>
        set((state) => {
          state.isDirty = isDirty;
        }),
    })),
    {
      name: 'calendar-builder-storage',
      partialize: (state) => ({
        styles: state.styles,
        exportFormat: state.exportFormat,
        exportQuality: state.exportQuality,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<typeof current> | undefined;
        const styles = saved?.styles
          ? normalizeCalendarStyles(saved.styles as CalendarStyles)
          : current.styles;
        return {
          ...current,
          ...saved,
          styles,
        };
      },
    }
  )
);
