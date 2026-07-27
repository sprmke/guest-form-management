import type { ReactNode } from 'react';

import { buildChatMessageRows } from '@/lib/chat/chatMessageFormat';
import { cn } from '@/lib/utils';

import { ChatDateSeparator } from '@/components/chat/ChatDateSeparator';

type Props<T extends { id: string; sent_at: string }> = {
  messages: T[];
  getOutbound: (message: T) => boolean;
  renderMessage: (message: T) => ReactNode;
  className?: string;
};

export function ChatMessageList<T extends { id: string; sent_at: string }>({
  messages,
  getOutbound,
  renderMessage,
  className,
}: Props<T>) {
  const rows = buildChatMessageRows(messages);

  return (
    <div className={cn('space-y-4', className)}>
      {rows.map((row) => {
        if (row.type === 'date') {
          return <ChatDateSeparator key={row.key} label={row.label} />;
        }

        const message = row.message;
        return (
          <div
            key={row.key}
            className={cn(
              'flex flex-col gap-1.5',
              getOutbound(message) ? 'items-end' : 'items-start'
            )}
          >
            {renderMessage(message)}
          </div>
        );
      })}
    </div>
  );
}
