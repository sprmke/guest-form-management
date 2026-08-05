/**
 * Shared chrome for the import modals (wizard + history) so both read as one
 * surface: same header rhythm, same body gutters, same footer alignment.
 */

import * as React from 'react';

import { AlertTriangle, Info, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ResponsiveModalTitle } from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

/** Matches the app's other split modals (GetVerifiedModal) so this reads as one system. */
const GUTTER = 'px-5 sm:px-6';

// ── Header ────────────────────────────────────────────────────────────────────

type HeaderProps = {
  icon: React.ReactNode;
  title: string;
  /** Rendered left of the close button (refresh, etc.). */
  actions?: React.ReactNode;
  /** Full-width row under the title (stepper). */
  below?: React.ReactNode;
  closeDisabled?: boolean;
  onClose: () => void;
};

export function ImportModalHeader({
  icon,
  title,
  actions,
  below,
  closeDisabled,
  onClose,
}: HeaderProps) {
  return (
    <div className={cn('border-border/70 shrink-0 border-b pb-3.5 pt-5', GUTTER)}>
      <div className="flex items-center gap-3">
        <span
          className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl"
          aria-hidden
        >
          {icon}
        </span>
        <ResponsiveModalTitle className="min-w-0 flex-1 truncate text-left text-base font-semibold">
          {title}
        </ResponsiveModalTitle>
        {actions}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-9 shrink-0"
          aria-label="Close"
          disabled={closeDisabled}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      {below ? <div className="mt-4">{below}</div> : null}
    </div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────

type StepperProps = {
  labels: string[];
  currentIndex: number;
};

/**
 * Segmented progress, not a labelled rail. The step heading in the body already
 * names where you are, so the header only has to say how far along you are.
 */
export function ImportStepper({ labels, currentIndex }: StepperProps) {
  const current = labels[currentIndex] ?? '';

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex flex-1 items-center gap-1"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={labels.length}
        aria-valuenow={currentIndex + 1}
        aria-valuetext={`Step ${currentIndex + 1} of ${labels.length}: ${current}`}
      >
        {labels.map((label, index) => (
          <span
            key={label}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= currentIndex ? 'bg-primary' : 'bg-muted'
            )}
            aria-hidden
          />
        ))}
      </div>
      <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums" aria-hidden>
        {currentIndex + 1}/{labels.length}
      </span>
    </div>
  );
}

// ── Body ──────────────────────────────────────────────────────────────────────

export function ImportModalBody({
  className,
  children,
  /** When true, body grows to fill a tall modal shell (preview / column mapping). */
  fill,
}: {
  className?: string;
  children: React.ReactNode;
  fill?: boolean;
}) {
  return (
    <div className={cn('min-h-0 overflow-y-auto py-4', fill && 'flex-1', GUTTER, className)}>
      {children}
    </div>
  );
}

/** Step title + one-line explanation. Same slot on every step so nothing jumps. */
export function ImportStepHeading({
  title,
  description,
  headingRef,
}: {
  title: string;
  description: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="mb-4 space-y-1">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-foreground text-[15px] font-semibold leading-snug outline-none"
      >
        {title}
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/** Persistent reminder of which file is being worked on. */
export function ImportFileBar({
  fileName,
  rowCount,
  columnCount,
}: {
  fileName: string;
  rowCount: number;
  columnCount?: number;
}) {
  return (
    <div className="bg-muted/40 text-muted-foreground mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
      <span className="text-foreground min-w-0 flex-1 truncate font-medium">{fileName}</span>
      <span className="shrink-0 tabular-nums">
        {rowCount.toLocaleString()} rows
        {typeof columnCount === 'number' ? ` · ${columnCount} columns` : ''}
      </span>
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────

type AlertTone = 'error' | 'warning' | 'info';

const ALERT_STYLES: Record<AlertTone, string> = {
  error: 'border-destructive/30 bg-destructive/5 text-destructive',
  warning:
    'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
  info: 'border-border bg-muted/40 text-muted-foreground',
};

export function ImportAlert({
  tone = 'error',
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === 'info' ? Info : AlertTriangle;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
        ALERT_STYLES[tone],
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="leading-relaxed">{children}</div>
        {action}
      </div>
    </div>
  );
}

// ── Stat strip ────────────────────────────────────────────────────────────────

export type ImportStat = {
  label: string;
  value: number;
  tone?: 'primary' | 'neutral' | 'danger' | 'warning';
};

const STAT_TONES: Record<NonNullable<ImportStat['tone']>, string> = {
  primary: 'text-primary',
  neutral: 'text-foreground',
  danger: 'text-destructive',
  warning: 'text-amber-600 dark:text-amber-400',
};

export function ImportStatStrip({ stats }: { stats: ImportStat[] }) {
  return (
    <dl
      className={cn(
        'divide-border/70 border-border/70 grid divide-x overflow-hidden rounded-xl border',
        stats.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
        stats.length > 2 && 'max-sm:divide-y'
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-muted/25 px-3 py-2.5">
          <dt className="text-muted-foreground text-xs">{stat.label}</dt>
          <dd
            className={cn(
              'mt-0.5 text-xl font-semibold tabular-nums',
              STAT_TONES[stat.tone ?? 'neutral']
            )}
          >
            {stat.value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

/** Secondary action sits left, primary right, on every step. */
export function ImportModalFooter({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  if (!left && !right) return null;

  return (
    <div
      className={cn(
        'border-border/70 shrink-0 border-t pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5 sm:pb-4 sm:pt-4',
        GUTTER
      )}
    >
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-start gap-2 empty:hidden">{left}</div>
        <div className="flex items-center justify-end gap-2 empty:hidden">{right}</div>
      </div>
    </div>
  );
}
