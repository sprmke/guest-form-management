import { useEffect, useRef } from 'react';

import { FileText, ImagePlus } from 'lucide-react';

import { AssistantSuggestionGroups } from '@/features/dashboard/ai-assistant/components/AssistantSuggestionGroups';
import { AssistantThinkingIndicator } from '@/features/dashboard/ai-assistant/components/AssistantThinkingIndicator';
import { ChatBlockRenderer } from '@/features/dashboard/ai-assistant/components/ChatBlockRenderer';
import type { ChatThreadMessage } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantChat';
import type {
  ChatBlock,
  ConfirmActionResponse,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import type { AssistantSuggestion } from '@/features/dashboard/ai-assistant/lib/assistantSuggestions';
import { isAssistantImageMime } from '@/features/dashboard/ai-assistant/lib/chatAttachments';

type Props = {
  messages: ChatThreadMessage[];
  pending: boolean;
  sending?: boolean;
  onResolveAction: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
  onFillComposer?: (prompt: string) => void;
  onOpenCanvas?: (block: ChatBlock) => void;
  questions: AssistantSuggestion[];
  actions: AssistantSuggestion[];
  onPickSuggestion: (prompt: string) => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ChatThread({
  messages,
  pending,
  sending = false,
  onResolveAction,
  onFillComposer,
  onOpenCanvas,
  questions,
  actions,
  onPickSuggestion,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages.length, sending]);

  if (messages.length === 0 && !sending) {
    return (
      <AssistantSuggestionGroups
        questions={questions}
        actions={actions}
        onPick={onPickSuggestion}
        disabled={pending}
      />
    );
  }

  return (
    <div
      className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3"
      aria-live="polite"
      aria-busy={sending}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
        >
          <div
            className={
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-3 py-2'
                : 'min-w-0 max-w-[92%]'
            }
          >
            {msg.role === 'user' ? (
              <div className="space-y-1.5">
                {msg.attachedContext && msg.attachedContext.length > 0 ? (
                  <p className="text-primary-foreground/80 text-xs">
                    {msg.attachedContext.map((item) => item.label).join(' · ')}
                  </p>
                ) : null}
                {msg.attachments && msg.attachments.length > 0 ? (
                  <ul className="flex flex-wrap gap-1">
                    {msg.attachments.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="bg-primary-foreground/15 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                      >
                        {isAssistantImageMime(file.mimeType) ? (
                          <ImagePlus className="h-3 w-3 shrink-0" aria-hidden />
                        ) : (
                          <FileText className="h-3 w-3 shrink-0" aria-hidden />
                        )}
                        <span className="truncate">{file.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {msg.text ? <p className="break-words text-sm">{msg.text}</p> : null}
              </div>
            ) : (
              <ChatBlockRenderer
                blocks={msg.blocks}
                onResolveAction={onResolveAction}
                onFillComposer={onFillComposer}
                onOpenCanvas={onOpenCanvas}
              />
            )}
          </div>
        </div>
      ))}
      {sending ? <AssistantThinkingIndicator /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
