import { ActionConfirmationBlock } from '@/features/dashboard/ai-assistant/components/blocks/ActionConfirmationBlock';
import { BookingCardBlock } from '@/features/dashboard/ai-assistant/components/blocks/BookingCardBlock';
import { ChatCanvasCompactCard } from '@/features/dashboard/ai-assistant/components/blocks/ChatCanvasCompactCard';
import { DataTableBlock } from '@/features/dashboard/ai-assistant/components/blocks/DataTableBlock';
import { FileListBlock } from '@/features/dashboard/ai-assistant/components/blocks/FileListBlock';
import { ImageBlock } from '@/features/dashboard/ai-assistant/components/blocks/ImageBlock';
import { LinkListBlock } from '@/features/dashboard/ai-assistant/components/blocks/LinkListBlock';
import { QuickActionsBlock } from '@/features/dashboard/ai-assistant/components/blocks/QuickActionsBlock';
import { StatListBlock } from '@/features/dashboard/ai-assistant/components/blocks/StatListBlock';
import { StepperBlock } from '@/features/dashboard/ai-assistant/components/blocks/StepperBlock';
import { TextBlock } from '@/features/dashboard/ai-assistant/components/blocks/TextBlock';
import type {
  ChatBlock,
  ConfirmActionResponse,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { isCanvasWorthyBlock } from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';

type Props = {
  blocks: ChatBlock[];
  onResolveAction: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
  onFillComposer?: (prompt: string) => void;
  onOpenCanvas?: (block: ChatBlock) => void;
  variant?: 'inline' | 'canvas';
};

/** Dispatches on block.type — unknown block types are dropped, never rendered raw. */
export function ChatBlockRenderer({
  blocks,
  onResolveAction,
  onFillComposer,
  onOpenCanvas,
  variant = 'inline',
}: Props) {
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (variant === 'inline' && isCanvasWorthyBlock(block) && onOpenCanvas) {
          return <ChatCanvasCompactCard key={i} block={block} onOpen={() => onOpenCanvas(block)} />;
        }
        switch (block.type) {
          case 'text':
            return <TextBlock key={i} text={block.text} />;
          case 'booking_card':
            return <BookingCardBlock key={i} {...block} />;
          case 'stat_list':
            return <StatListBlock key={i} {...block} />;
          case 'data_table':
            return <DataTableBlock key={i} {...block} />;
          case 'link_list':
            return <LinkListBlock key={i} {...block} />;
          case 'file_list':
            return <FileListBlock key={i} {...block} />;
          case 'image':
            return <ImageBlock key={i} {...block} />;
          case 'stepper':
            return <StepperBlock key={i} {...block} onResolveAction={onResolveAction} />;
          case 'quick_actions':
            return (
              <QuickActionsBlock key={i} actions={block.actions} onFillComposer={onFillComposer} />
            );
          case 'action_confirmation':
            return <ActionConfirmationBlock key={i} {...block} onResolve={onResolveAction} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
