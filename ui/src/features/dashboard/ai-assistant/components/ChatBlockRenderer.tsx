import { ActionConfirmationBlock } from '@/features/dashboard/ai-assistant/components/blocks/ActionConfirmationBlock';
import { BookingCardBlock } from '@/features/dashboard/ai-assistant/components/blocks/BookingCardBlock';
import { DataTableBlock } from '@/features/dashboard/ai-assistant/components/blocks/DataTableBlock';
import { FileListBlock } from '@/features/dashboard/ai-assistant/components/blocks/FileListBlock';
import { LinkListBlock } from '@/features/dashboard/ai-assistant/components/blocks/LinkListBlock';
import { StatListBlock } from '@/features/dashboard/ai-assistant/components/blocks/StatListBlock';
import { TextBlock } from '@/features/dashboard/ai-assistant/components/blocks/TextBlock';
import type {
  ChatBlock,
  ConfirmActionResponse,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';

type Props = {
  blocks: ChatBlock[];
  onResolveAction: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
};

/** Dispatches on block.type — unknown block types are dropped, never rendered raw. */
export function ChatBlockRenderer({ blocks, onResolveAction }: Props) {
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
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
          case 'action_confirmation':
            return <ActionConfirmationBlock key={i} {...block} onResolve={onResolveAction} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
