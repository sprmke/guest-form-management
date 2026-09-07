import { useEffect, useRef } from 'react';

import { FileText, ImagePlus, RotateCcw } from 'lucide-react';

import { AssistantMessageCard } from '@/features/dashboard/ai-assistant/components/AssistantMessageCard';
import { AssistantSuggestionGroups } from '@/features/dashboard/ai-assistant/components/AssistantSuggestionGroups';
import { AssistantTurnProgress } from '@/features/dashboard/ai-assistant/components/AssistantTurnProgress';
import { TextBlock } from '@/features/dashboard/ai-assistant/components/blocks/TextBlock';
import type { ChatThreadMessage } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantChat';
import type {
  ChatBlock,
  ConfirmActionResponse,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import type { TurnProgressLiveState } from '@/features/dashboard/ai-assistant/lib/assistantStream';
import type { AssistantSuggestion } from '@/features/dashboard/ai-assistant/lib/assistantSuggestions';
import { isAssistantImageMime } from '@/features/dashboard/ai-assistant/lib/chatAttachments';
import { assistantBubbleWidthClass } from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';

import { Button } from '@/components/ui/button';

type Props = {
  messages: ChatThreadMessage[];
  pending: boolean;
  sending?: boolean;
  sendStartedAtMs?: number | null;
  turnProgress?: TurnProgressLiveState | null;
  streamingText?: string;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  onResolveAction: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
  onRunQuickAction?: (action: { label: string; prompt: string }) => void;
  quickActionsDisabled?: boolean;
  onOpenCanvas?: (block: ChatBlock) => void;
  onSubmitForm?: (
    block: Extract<ChatBlock, { type: 'dynamic_form' }>,
    values: Record<string, string>
  ) => void;
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
  sendStartedAtMs = null,
  turnProgress = null,
  streamingText = '',
  canRegenerate = false,
  onRegenerate,
  onResolveAction,
  onRunQuickAction,
  quickActionsDisabled = false,
  onOpenCanvas,
  onSubmitForm,
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
  }, [messages.length, sending, turnProgress?.steps.length, streamingText.length]);

  const lastMessageIndex = messages.length - 1;

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
      {messages.map((msg, index) => (
        <div
          key={msg.id}
          className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
        >
          <div
            className={
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-3 py-2'
                : `group min-w-0 ${assistantBubbleWidthClass(msg.blocks)}`
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
                {msg.text ? (
                  <p className="whitespace-pre-line break-words text-sm">{msg.text}</p>
                ) : null}
              </div>
            ) : (
              <>
                <AssistantMessageCard
                  blocks={msg.blocks}
                  onResolveAction={onResolveAction}
                  onRunQuickAction={onRunQuickAction}
                  quickActionsDisabled={quickActionsDisabled}
                  onOpenCanvas={onOpenCanvas}
                  onSubmitForm={onSubmitForm}
                />
                {canRegenerate && index === lastMessageIndex && onRegenerate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground mt-1 h-8 px-2 text-xs sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                    onClick={onRegenerate}
                    aria-label="Regenerate response"
                  >
                    <RotateCcw className="mr-1.5 size-3.5" aria-hidden />
                    Regenerate
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ))}
      {sending ? (
        streamingText ? (
          <div className="flex justify-start">
            <div className="border-border/60 bg-card w-full max-w-[92%] rounded-2xl rounded-bl-md border p-3 shadow-sm">
              <TextBlock text={streamingText} />
            </div>
          </div>
        ) : (
          <AssistantTurnProgress live={turnProgress} startedAtMs={sendStartedAtMs ?? undefined} />
        )
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
