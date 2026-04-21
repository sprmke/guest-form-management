import { cn } from '@/lib/utils';
import { statusLabel, statusTone, type StatusTone } from '@/features/admin/lib/bookingStatus';

// Color intent mapped to Tailwind utility classes. Tokens resolve against index.css.
// Ring provides the "dot" look without an extra span, keeping the badge copy readable
// on its own (status is not communicated by color alone — see a11y skill).
const TONE_CLASSES: Record<StatusTone, string> = {
  red:     'bg-red-50 text-red-800 ring-red-200',
  yellow:  'bg-amber-50 text-amber-900 ring-amber-200',
  green:   'bg-emerald-50 text-emerald-900 ring-emerald-200',
  orange:  'bg-orange-50 text-orange-900 ring-orange-200',
  blue:    'bg-sky-50 text-sky-900 ring-sky-200',
  purple:  'bg-violet-50 text-violet-900 ring-violet-200',
  neutral: 'bg-muted text-foreground ring-border',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  red:     'bg-red-500',
  yellow:  'bg-amber-500',
  green:   'bg-emerald-500',
  orange:  'bg-orange-500',
  blue:    'bg-sky-500',
  purple:  'bg-violet-500',
  neutral: 'bg-muted-foreground/60',
};

type Props = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const tone = statusTone(status);
  const label = statusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', DOT_CLASSES[tone])}
      />
      {label}
    </span>
  );
}
