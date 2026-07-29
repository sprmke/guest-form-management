/**
 * Stay-guide link block — ported from the pre-decomposition `WorkflowPanel.tsx`.
 * Rail-only: renders `null` in modal mode (kanban dialog has no stay-guide slot).
 */

import { Loader2 } from 'lucide-react';

import { InlineCopyIconButton } from '@/features/dashboard/bookings/components/InlineCopyIconButton';
import { workflowInlineLink } from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';

type Props = {
  isModal: boolean;
  showStayGuide: boolean;
  stayGuideUrl: string;
  /** transitionMut.isPending || issueStayGuideMut.isPending */
  pending: boolean;
  onCopy: () => void;
};

export function WorkflowStayGuideBlock({
  isModal,
  showStayGuide,
  stayGuideUrl,
  pending,
  onCopy,
}: Props) {
  if (isModal || !showStayGuide) return null;

  return (
    <div className="border-separator border-b px-4 py-4">
      <p className="text-overline text-muted-foreground mb-2 font-semibold">Stay guide</p>
      {stayGuideUrl ? (
        <span className="inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-1">
          <a
            href={stayGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={workflowInlineLink}
          >
            Open stay guide
          </a>
          <InlineCopyIconButton aria-label="Copy stay guide link to clipboard" onClick={onCopy} />
        </span>
      ) : pending ? (
        <Loader2
          className="text-muted-foreground size-4 animate-spin"
          aria-label="Preparing stay guide link"
        />
      ) : null}
    </div>
  );
}
