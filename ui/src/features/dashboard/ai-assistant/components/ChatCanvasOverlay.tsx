import { ChatBlockRenderer } from '@/features/dashboard/ai-assistant/components/ChatBlockRenderer';
import type {
  ChatBlock,
  ConfirmActionResponse,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { canvasBlockTitle } from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  block: ChatBlock;
  onClose: () => void;
  onResolveAction: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
  onFillComposer?: (prompt: string) => void;
  className?: string;
};

export function ChatCanvasOverlay({
  block,
  onClose,
  onResolveAction,
  onFillComposer,
  className,
}: Props) {
  const title = canvasBlockTitle(block) || 'Assistant';

  return (
    <section
      className={cn('bg-background flex min-h-0 min-w-0 flex-1 flex-col', className)}
      aria-label={title}
    >
      <div className="border-border/60 flex items-center gap-2 border-b p-3">
        <Button
          type="button"
          variant="ghost"
          className="min-h-[44px] min-w-[44px] shrink-0 px-3"
          onClick={onClose}
        >
          Back
        </Button>
        <h2 className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <ChatBlockRenderer
          blocks={[block]}
          onResolveAction={onResolveAction}
          onFillComposer={onFillComposer}
          variant="canvas"
        />
      </div>
    </section>
  );
}
