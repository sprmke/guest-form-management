import { ActivityTimelineBlock } from '@/features/dashboard/ai-assistant/components/blocks/ActivityTimelineBlock';
import { ChatBlockRenderer } from '@/features/dashboard/ai-assistant/components/ChatBlockRenderer';
import { QuickActionsBlock } from '@/features/dashboard/ai-assistant/components/blocks/QuickActionsBlock';
import type {
  ChatBlock,
  ConfirmActionResponse,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { partitionAssistantBlocks } from '@/features/dashboard/ai-assistant/lib/partitionAssistantBlocks';

import { cn } from '@/lib/utils';

type Props = {
  blocks: ChatBlock[];
  onResolveAction: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
  onRunQuickAction?: (action: { label: string; prompt: string }) => void;
  quickActionsDisabled?: boolean;
  onOpenCanvas?: (block: ChatBlock) => void;
  className?: string;
};

/** Groups steps, answer, and suggested actions into one assistant turn card. */
export function AssistantMessageCard({
  blocks,
  onResolveAction,
  onRunQuickAction,
  quickActionsDisabled,
  onOpenCanvas,
  className,
}: Props) {
  const { stepEntries, content, quickActions } = partitionAssistantBlocks(blocks);
  const hasContent = content.length > 0;
  const hasFooter = quickActions.length > 0;

  if (!stepEntries && !hasContent && !hasFooter) return null;

  return (
    <div
      className={cn(
        'border-border/60 bg-card w-full max-w-[92%] overflow-hidden rounded-2xl rounded-bl-md border shadow-sm',
        className
      )}
    >
      {stepEntries ? (
        <ActivityTimelineBlock entries={stepEntries} variant="embedded" defaultOpen={false} />
      ) : null}

      {hasContent ? (
        <div className={cn('space-y-2 p-3', stepEntries && 'pt-2')}>
          <ChatBlockRenderer
            blocks={content}
            onResolveAction={onResolveAction}
            onRunQuickAction={onRunQuickAction}
            quickActionsDisabled={quickActionsDisabled}
            onOpenCanvas={onOpenCanvas}
            variant="inline"
          />
        </div>
      ) : null}

      {hasFooter ? (
        <div
          className={cn(
            'border-border/60 border-t px-3 py-2.5',
            !hasContent && !stepEntries && 'border-t-0'
          )}
        >
          <QuickActionsBlock
            actions={quickActions}
            disabled={quickActionsDisabled}
            onRunAction={onRunQuickAction}
            showHeading
          />
        </div>
      ) : null}
    </div>
  );
}
