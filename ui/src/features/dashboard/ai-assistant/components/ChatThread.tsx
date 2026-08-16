import { useEffect, useRef } from 'react';

import { Loader2, Sparkles } from 'lucide-react';

import { ChatBlockRenderer } from '@/features/dashboard/ai-assistant/components/ChatBlockRenderer';
import type { ChatThreadMessage } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantChat';
import type { ConfirmActionResponse } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';

type Props = {
  messages: ChatThreadMessage[];
  pending: boolean;
  onResolveAction: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
};

export function ChatThread({ messages, pending, onResolveAction }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pending]);

  if (messages.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm">
        <Sparkles className="h-6 w-6" aria-hidden />
        <p>Ask what&apos;s checking in today, why a booking is stuck, or move a booking forward.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-3" aria-live="polite">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
        >
          <div
            className={
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground max-w-[85%] rounded-xl px-3 py-2'
                : 'max-w-[92%]'
            }
          >
            {msg.role === 'user' ? (
              <p className="text-sm">{msg.text}</p>
            ) : (
              <ChatBlockRenderer blocks={msg.blocks} onResolveAction={onResolveAction} />
            )}
          </div>
        </div>
      ))}
      {pending && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Thinking…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
