import { cn } from "@/lib/utils";

/** Shared base for full-width workflow rail action buttons. */
const workflowActionBtnBase =
  "flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 motion-safe:active:scale-[0.99] disabled:opacity-50";

const workflowActionBack =
  "border border-border/60 bg-background/80 text-muted-foreground shadow-elevated hover:border-primary/25 hover:bg-muted/60 hover:text-foreground";

const workflowActionPrimaryEnabled =
  "gradient-primary border border-transparent text-primary-foreground shadow-soft hover:brightness-[1.03] hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)]";

const workflowActionPrimaryDisabled =
  "cursor-not-allowed border border-border/50 bg-muted/50 font-medium text-muted-foreground shadow-none";

const workflowActionWarning =
  "border border-amber-500/25 bg-amber-500/[0.08] text-amber-800 hover:bg-amber-500/[0.12] hover:border-amber-500/35 dark:text-amber-300";

const workflowActionDestructive =
  "border border-rose-500/25 bg-rose-500/[0.07] text-rose-700 hover:bg-rose-500/[0.12] hover:border-rose-500/35 dark:text-rose-300";

const workflowActionNeutral =
  "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground";

export function workflowPrimaryActionClass(enabled: boolean): string {
  return cn(
    workflowActionBtnBase,
    enabled ? workflowActionPrimaryEnabled : workflowActionPrimaryDisabled,
  );
}

export function workflowBackActionClass(): string {
  return cn(workflowActionBtnBase, workflowActionBack);
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
  "text-sm font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:text-primary/90 sm:text-[13px] sm:font-normal";

/** Full-width image upload / replace control in workflow sub-forms. */
const workflowUploadBtnBase =
  "flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors";

const workflowUploadBtnDisabled =
  "cursor-not-allowed bg-muted text-muted-foreground ring-1 ring-slate-200 dark:ring-border/60";

const workflowUploadBtnEnabled =
  "bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30 dark:hover:bg-blue-500/20";

export function workflowUploadButtonClass(disabled: boolean): string {
  return cn(
    workflowUploadBtnBase,
    disabled ? workflowUploadBtnDisabled : workflowUploadBtnEnabled,
  );
}

/** "View image" link on asset preview rows in workflow sub-forms. */
export const workflowAssetViewLink =
  "inline-flex items-center gap-1 text-[11px] text-blue-600 group-hover:underline dark:text-blue-400";

/** Clickable asset preview card (receipt / endorsement). */
export const workflowAssetPreviewCard =
  "group flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-blue-300 dark:hover:border-blue-500/40";
