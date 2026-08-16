/**
 * Auto / Manual pill for workflow card titles.
 * Hover or focus opens a tooltip that explains who moves the booking forward.
 */

import {
  WORKFLOW_ADVANCE_MODE_HINT,
  WORKFLOW_ADVANCE_MODE_LABEL,
  workflowAdvanceModeAria,
  type WorkflowAdvanceMode,
} from '@/features/dashboard/bookings/lib/workflowAdvanceMode';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type MarkProps = {
  mode: WorkflowAdvanceMode;
  className?: string;
};

const markClass = (mode: WorkflowAdvanceMode) =>
  cn(
    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
    mode === 'auto'
      ? 'bg-primary/10 text-primary ring-primary/20'
      : 'bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300 dark:ring-amber-500/30'
  );

/** Non-interactive pill — use in the All steps map where the line already explains. */
export function WorkflowAdvanceModeMark({ mode, className }: MarkProps) {
  return (
    <span className={cn(markClass(mode), className)}>{WORKFLOW_ADVANCE_MODE_LABEL[mode]}</span>
  );
}

type Props = {
  mode: WorkflowAdvanceMode;
  className?: string;
};

export function WorkflowAdvanceModeBadge({ mode, className }: Props) {
  const hint = WORKFLOW_ADVANCE_MODE_HINT[mode];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="focus-ring -mx-1 -my-1 inline-flex shrink-0 items-center rounded-full p-1"
            aria-label={workflowAdvanceModeAria(mode)}
          >
            <WorkflowAdvanceModeMark mode={mode} className={className} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[min(90vw,18rem)] text-xs leading-snug">
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
