import { Loader2, RotateCcw } from 'lucide-react';

import { workflowNeutralActionClass } from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';
import { shortDocStepLabel } from '@/features/dashboard/bookings/lib/workflowStageDeck';

import { cn } from '@/lib/utils';

type Props = {
  docLabel: string;
  disabled?: boolean;
  busy?: boolean;
  isModal?: boolean;
  onClick: () => void;
};

export function WorkflowMarkDocIncompleteAction({
  docLabel,
  disabled,
  busy,
  isModal,
  onClick,
}: Props) {
  const shortLabel = shortDocStepLabel(docLabel);

  return (
    <div
      className={cn(
        isModal ? 'shrink-0 px-5 pt-1' : 'border-separator shrink-0 border-b px-4 py-3'
      )}
    >
      <button
        type="button"
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        onClick={onClick}
        className={cn(workflowNeutralActionClass(), 'justify-center gap-2')}
      >
        {busy ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <RotateCcw className="size-4 shrink-0" aria-hidden />
        )}
        <span>Mark {shortLabel} incomplete</span>
      </button>
    </div>
  );
}
