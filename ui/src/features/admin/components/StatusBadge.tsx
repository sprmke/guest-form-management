import { cn } from '@/lib/utils';
import {
  statusLabel,
  statusTone,
  type StatusTone,
} from '@/features/admin/lib/bookingStatus';

export type StatusToneStyle = {
  badge: string;
  dot: string;
  /** Subtle pulse on the dot for statuses that need admin attention. */
  pulse?: boolean;
};

/** Soft tinted badges aligned with the teal admin shell — no heavy ring borders. */
export const STATUS_TONE_STYLES: Record<StatusTone, StatusToneStyle> = {
  red: {
    badge:
      'border-rose-500/20 bg-rose-500/[0.07] text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-300',
    dot: 'bg-rose-500 shadow-[0_0_0_2px_hsl(0_0%_100%_/_0.9)] dark:shadow-[0_0_0_2px_hsl(0_0%_0%_/_0.35)]',
    pulse: true,
  },
  yellow: {
    badge:
      'border-amber-500/20 bg-amber-500/[0.07] text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300',
    dot: 'bg-amber-500 shadow-[0_0_0_2px_hsl(0_0%_100%_/_0.9)] dark:shadow-[0_0_0_2px_hsl(0_0%_0%_/_0.35)]',
  },
  green: {
    badge:
      'border-primary/30 bg-primary/[0.08] text-[hsl(168_65%_30%)] dark:border-primary/35 dark:bg-primary/12 dark:text-primary',
    dot: 'bg-primary shadow-[0_0_0_2px_hsl(0_0%_100%_/_0.9)] dark:shadow-[0_0_0_2px_hsl(0_0%_0%_/_0.35)]',
  },
  amber: {
    badge:
      'border-orange-500/22 bg-orange-500/[0.07] text-orange-800 dark:border-orange-400/25 dark:bg-orange-500/10 dark:text-orange-300',
    dot: 'bg-orange-500 shadow-[0_0_0_2px_hsl(0_0%_100%_/_0.9)] dark:shadow-[0_0_0_2px_hsl(0_0%_0%_/_0.35)]',
  },
  orange: {
    badge:
      'border-orange-500/25 bg-orange-500/[0.08] text-orange-700 dark:border-orange-400/28 dark:bg-orange-500/10 dark:text-orange-300',
    dot: 'bg-orange-500 shadow-[0_0_0_2px_hsl(0_0%_100%_/_0.9)] dark:shadow-[0_0_0_2px_hsl(0_0%_0%_/_0.35)]',
  },
  blue: {
    badge:
      'border-sky-500/20 bg-sky-500/[0.07] text-sky-800 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-300',
    dot: 'bg-sky-500 shadow-[0_0_0_2px_hsl(0_0%_100%_/_0.9)] dark:shadow-[0_0_0_2px_hsl(0_0%_0%_/_0.35)]',
  },
  purple: {
    badge:
      'border-border/80 bg-muted/70 text-muted-foreground dark:border-border dark:bg-muted/50',
    dot: 'bg-muted-foreground/70 shadow-[0_0_0_2px_hsl(0_0%_100%_/_0.9)] dark:shadow-[0_0_0_2px_hsl(0_0%_0%_/_0.35)]',
  },
  neutral: {
    badge: 'border-border/80 bg-muted/60 text-muted-foreground dark:bg-muted/40',
    dot: 'bg-muted-foreground',
  },
};

export function statusToneStyle(status: string): StatusToneStyle {
  return STATUS_TONE_STYLES[statusTone(status)];
}

type Props = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const label = statusLabel(status);
  const style = statusToneStyle(status);

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1',
        'text-xs font-semibold leading-tight tracking-tight whitespace-nowrap',
        'transition-colors duration-200',
        style.badge,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          style.dot,
          style.pulse && 'motion-safe:animate-pulse',
        )}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
