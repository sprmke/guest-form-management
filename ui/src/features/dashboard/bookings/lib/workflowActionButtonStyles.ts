import { cn } from '@/lib/utils';

/** Shared base for full-width workflow rail action buttons. */
const workflowActionBtnBase =
  'flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 motion-safe:active:scale-[0.99] disabled:opacity-50';

/**
 * The rail's forward CTA. Label and arrow are one centred group rather than
 * pinned to opposite edges — at rail width `justify-between` strands the arrow
 * against the far edge and the button stops reading as a single control.
 */
const workflowPrimaryBase =
  'focus-ring flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 motion-safe:active:scale-[0.99]';

const workflowActionPrimaryEnabled =
  'gradient-primary border border-transparent text-primary-foreground shadow-soft hover:brightness-[1.03] hover:shadow-primary-glow';

// Solid fill, not the back button's card fill — a disabled CTA still has to be
// distinguishable from the secondary sitting right next to it.
const workflowActionPrimaryDisabled =
  'cursor-not-allowed border border-border/60 bg-muted text-muted-foreground shadow-none';

/** Secondary sibling of the primary CTA — same height, radius and type scale. */
export const workflowBackActionClass =
  'focus-ring border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-[44px] min-w-0 items-center justify-center rounded-xl border px-4 py-2.5 text-center text-sm font-semibold transition-colors motion-safe:active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40';

/** Icon + wrapped label, centred as one unit inside paired workflow CTAs. */
export const workflowActionLabelGroupClass =
  'inline-flex min-w-0 max-w-full items-center justify-center gap-1.5';

export const workflowActionLabelTextClass = 'min-w-0 text-pretty text-center leading-snug';

const workflowActionWarning =
  'border border-amber-500/25 bg-amber-500/[0.08] text-amber-800 hover:bg-amber-500/[0.12] hover:border-amber-500/35 dark:text-amber-300';

const workflowActionDestructive =
  'border border-rose-500/25 bg-rose-500/[0.07] text-rose-700 hover:bg-rose-500/[0.12] hover:border-rose-500/35 dark:text-rose-300';

const workflowActionNeutral =
  'border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground';

export function workflowPrimaryActionClass(enabled: boolean): string {
  return cn(
    workflowPrimaryBase,
    enabled ? workflowActionPrimaryEnabled : workflowActionPrimaryDisabled
  );
}

export function workflowWarningActionClass(): string {
  return cn(workflowActionBtnBase, workflowActionWarning);
}

export function workflowDestructiveActionClass(): string {
  return cn(workflowActionBtnBase, workflowActionDestructive);
}

export function workflowNeutralActionClass(): string {
  return cn(workflowActionBtnBase, workflowActionNeutral);
}

/** Inline text link inside the workflow rail (e.g. SD refund link). */
export const workflowInlineLink =
  'text-sm font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:text-primary/90 sm:text-[13px] sm:font-normal';

/** Full-width image upload / replace control in workflow sub-forms. */
const workflowUploadBtnBase =
  'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors';

const workflowUploadBtnDisabled =
  'cursor-not-allowed bg-muted text-muted-foreground ring-1 ring-slate-200 dark:ring-border/60';

const workflowUploadBtnEnabled =
  'bg-primary/10 text-primary ring-1 ring-primary/25 hover:bg-primary/15 dark:bg-primary/10 dark:text-primary dark:ring-primary/30 dark:hover:bg-primary/20';

export function workflowUploadButtonClass(disabled: boolean): string {
  return cn(workflowUploadBtnBase, disabled ? workflowUploadBtnDisabled : workflowUploadBtnEnabled);
}

/** "View image" link on asset preview rows in workflow sub-forms. */
export const workflowAssetViewLink =
  'inline-flex items-center gap-1 text-[11px] text-primary group-hover:underline';

/** Clickable asset preview card (receipt / endorsement). */
export const workflowAssetPreviewCard =
  'group flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/40 dark:hover:border-primary/40';
