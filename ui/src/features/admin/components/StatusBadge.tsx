import { cn } from '@/lib/utils';
import {
  statusLabel,
  statusTone,
  type StatusTone,
} from '@/features/admin/lib/bookingStatus';

// Richer tones — still tasteful, more decisive than pastel.
// Two-layer approach: colored bg + slightly stronger text + live dot for actionable statuses.
const TONE_BG: Record<StatusTone, string> = {
  red: 'bg-red-50 text-red-700 ring-red-200/80',
  yellow: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  amber: 'bg-amber-50 text-amber-900 ring-amber-300/70',
  orange: 'bg-orange-50 text-orange-800 ring-orange-200/80',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200/80',
  purple: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  neutral: 'bg-slate-50 text-slate-700 ring-slate-200/80',
};

const DOT_COLOR: Record<StatusTone, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-600',
  orange: 'bg-orange-500',
  blue: 'bg-sky-500',
  purple: 'bg-violet-500',
  neutral: 'bg-slate-400',
};

// Statuses that are actively "in-progress" — their dot gets a subtle pulse animation
// so admins can see at a glance which rows need attention.
const PULSE_TONES: ReadonlySet<StatusTone> = new Set([
  'red',
  'yellow',
  'amber',
  'orange',
]);

type Props = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const tone = statusTone(status);
  const label = statusLabel(status);
  const shouldPulse = PULSE_TONES.has(tone);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-0.5',
        'text-xs font-semibold',
        'ring-1 ring-inset whitespace-nowrap',
        TONE_BG[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-[5px] rounded-full shrink-0',
          DOT_COLOR[tone],
          shouldPulse && 'motion-safe:animate-pulse',
        )}
      />
      {label}
    </span>
  );
}
