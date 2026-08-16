import { useEffect, useRef } from 'react';

import { FileText, ImagePlus, Loader2 } from 'lucide-react';

import { AssistantSuggestionGroups } from '@/features/dashboard/ai-assistant/components/AssistantSuggestionGroups';
import { ChatBlockRenderer } from '@/features/dashboard/ai-assistant/components/ChatBlockRenderer';
import type { ChatThreadMessage } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantChat';
import type { ConfirmActionResponse } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import type { AssistantSuggestion } from '@/features/dashboard/ai-assistant/lib/assistantSuggestions';
import { isAssistantImageMime } from '@/features/dashboard/ai-assistant/lib/chatAttachments';

type Props = {
  messages: ChatThreadMessage[];
  pending: boolean;
  onResolveAction: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
  questions: AssistantSuggestion[];
  actions: AssistantSuggestion[];
  onPickSuggestion: (prompt: string) => void;
};

export function ChatThread({
  messages,
  pending,
  onResolveAction,
  questions,
  actions,
  onPickSuggestion,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pending]);

  if (messages.length === 0) {
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
              <div className="space-y-1.5">
                {msg.bookingLabel ? (
                  <p className="text-primary-foreground/80 text-xs">{msg.bookingLabel}</p>
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
                {msg.text ? <p className="text-sm">{msg.text}</p> : null}
              </div>
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
