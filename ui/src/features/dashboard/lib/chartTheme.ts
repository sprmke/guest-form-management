import { STATUS_TONE } from '@/features/admin/lib/bookingStatus';
import type { StatusTone } from '@/features/admin/lib/bookingStatus';

/** Chart-friendly HSL colors aligned with admin status tones. */
export const CHART_TONE_COLORS: Record<StatusTone, string> = {
  red: 'hsl(0 72% 51%)',
  yellow: 'hsl(38 92% 50%)',
  green: 'hsl(168 65% 40%)',
  amber: 'hsl(25 95% 53%)',
  orange: 'hsl(25 95% 53%)',
  blue: 'hsl(199 89% 48%)',
  purple: 'hsl(270 50% 55%)',
  neutral: 'hsl(0 0% 40%)',
};

export function pipelineBarColor(status: string): string {
  const tone = STATUS_TONE[status as keyof typeof STATUS_TONE] ?? 'neutral';
  return CHART_TONE_COLORS[tone];
}

export const CHART_PRIMARY = 'hsl(168 65% 38%)';
export const CHART_PRIMARY_SOFT = 'hsl(168 65% 38% / 0.16)';
export const CHART_SKY = 'hsl(199 89% 48%)';
export const CHART_SKY_SOFT = 'hsl(199 89% 48% / 0.15)';
export const CHART_GRID = 'hsl(240 6% 88% / 0.85)';
export const CHART_AXIS = 'hsl(240 4% 44%)';
