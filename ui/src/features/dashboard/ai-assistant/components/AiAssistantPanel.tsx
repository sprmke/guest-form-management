import { useCallback, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { History, Plus, X } from 'lucide-react';

import { ChatCanvasOverlay } from '@/features/dashboard/ai-assistant/components/ChatCanvasOverlay';
import { ChatComposer } from '@/features/dashboard/ai-assistant/components/ChatComposer';
import { ChatThread } from '@/features/dashboard/ai-assistant/components/ChatThread';
import { ConversationHistoryList } from '@/features/dashboard/ai-assistant/components/ConversationHistoryList';
import { useAiAssistantChat } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantChat';
import type {
  ChatBlock,
  ConfirmActionResponse,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import {
  ASSISTANT_ACTIONS,
  ASSISTANT_QUESTIONS,
  SUGGESTION_VISIBLE_COUNT,
  pickRandomSuggestions,
} from '@/features/dashboard/ai-assistant/lib/assistantSuggestions';
import { patchActionConfirmationStatus } from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isNestedOverlayTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        '[data-radix-popper-content-wrapper], [data-radix-dropdown-menu-content], [role="alertdialog"], [data-assistant-command-palette]'
      )
    )
  );
}

function isNestedOverlayEvent(event: {
  target: EventTarget | null;
  detail?: { originalEvent?: Event };
}): boolean {
  const orig = event.detail?.originalEvent;
  const related: EventTarget | null =
    orig && 'relatedTarget' in orig
      ? ((orig as { relatedTarget?: EventTarget | null }).relatedTarget ?? null)
      : null;
  return [event.target, orig?.target ?? null, related].some((node) => isNestedOverlayTarget(node));
}

export function AiAssistantPanel({ open, onOpenChange }: Props) {
  const propertyId = usePropertyIdParam();
  const { bookingId } = useParams<{ bookingId?: string }>();
  const pageContext = useMemo(
    () => ({ propertyId, bookingId: bookingId ?? null }),
    [propertyId, bookingId]
  );
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [suggestionNonce, setSuggestionNonce] = useState(0);
  const [composerKey, setComposerKey] = useState(0);
  const [overlayRoot, setOverlayRoot] = useState<HTMLDivElement | null>(null);
  const [canvasBlock, setCanvasBlock] = useState<ChatBlock | null>(null);
  const [fillText, setFillText] = useState<string | null>(null);
  const canvasOpen = canvasBlock != null;
  const questions = useMemo(
    () => pickRandomSuggestions(ASSISTANT_QUESTIONS, SUGGESTION_VISIBLE_COUNT),
    [suggestionNonce]
  );
  const actions = useMemo(
    () => pickRandomSuggestions(ASSISTANT_ACTIONS, SUGGESTION_VISIBLE_COUNT),
    [suggestionNonce]
  );

  const {
    conversationId,
    messages,
    pending,
    sending,
    error,
    upgradeHook,
    sendMessage,
    resolveAction,
    loadConversation,
    startNewConversation,
  } = useAiAssistantChat(pageContext);

  const handleResolveAction = useCallback(
    async (actionId: string, confirm: boolean): Promise<ConfirmActionResponse | null> => {
      const result = await resolveAction(actionId, confirm);
      if (result && result.status !== 'pending') {
        const nextStatus = result.status;
        setCanvasBlock((current) => {
          if (!current) return current;
          return patchActionConfirmationStatus([current], actionId, nextStatus)[0] ?? current;
        });
      }
      return result;
    },
    [resolveAction]
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setView('chat');
          setCanvasBlock(null);
        }
        if (next) setSuggestionNonce((n) => n + 1);
      }}
    >
      <SheetContent
        side="right"
        hideClose
        className={cn(
          'flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden p-0',
          canvasOpen ? 'sm:max-w-none lg:max-w-[min(calc(100vw-2rem),72rem)]' : 'sm:max-w-xl'
        )}
        onPointerDownOutside={(event) => {
          if (isNestedOverlayEvent(event)) event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (isNestedOverlayEvent(event)) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isNestedOverlayEvent(event)) event.preventDefault();
        }}
      >
        <SheetHeader
          className={cn(
            'border-border/60 flex-row items-center justify-between space-y-0 border-b p-3',
            canvasOpen && 'hidden lg:flex'
          )}
        >
          <SheetTitle className="text-base">AI Assistant</SheetTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => setView(view === 'history' ? 'chat' : 'history')}
              aria-label={view === 'history' ? 'Back to chat' : 'View past conversations'}
              aria-pressed={view === 'history'}
            >
              <History className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => {
                startNewConversation();
                setSuggestionNonce((n) => n + 1);
                setComposerKey((n) => n + 1);
                setView('chat');
                setCanvasBlock(null);
              }}
              aria-label="Start new conversation"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div
          className={cn('flex min-h-0 flex-1', canvasOpen ? 'flex-col lg:flex-row' : 'flex-col')}
        >
          {canvasOpen && canvasBlock ? (
            <ChatCanvasOverlay
              block={canvasBlock}
              onClose={() => setCanvasBlock(null)}
              onResolveAction={handleResolveAction}
              onFillComposer={setFillText}
              className="min-h-0 flex-1 lg:min-w-0"
            />
          ) : null}

          <div
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col',
              canvasOpen && 'hidden lg:flex lg:w-96 lg:flex-none lg:border-l'
            )}
          >
            {view === 'history' ? (
              <ConversationHistoryList
                activeConversationId={conversationId}
                onSelect={(id) => {
                  void loadConversation(id);
                  setComposerKey((n) => n + 1);
                  setView('chat');
                  setCanvasBlock(null);
                }}
                onDeleted={(id) => {
                  if (id === conversationId) {
                    startNewConversation();
                    setComposerKey((n) => n + 1);
                    setCanvasBlock(null);
                  }
                }}
              />
            ) : (
              <>
                <ChatThread
                  messages={messages}
                  pending={pending}
                  sending={sending}
                  onResolveAction={handleResolveAction}
                  onFillComposer={setFillText}
                  onOpenCanvas={setCanvasBlock}
                  questions={questions}
                  actions={actions}
                  onPickSuggestion={(prompt) => void sendMessage(prompt)}
                />

                {error && <p className="text-destructive px-3 pb-1 text-xs">{error}</p>}
                {upgradeHook && (
                  <p className="text-warning px-3 pb-1 text-xs">
                    You&apos;ve hit today&apos;s message limit for the assistant.
                  </p>
                )}

                <ChatComposer
                  key={composerKey}
                  onSend={(input) => void sendMessage(input)}
                  pageBookingId={bookingId}
                  disabled={pending}
                  overlayContainer={overlayRoot}
                  fillText={fillText}
                  onFillConsumed={() => setFillText(null)}
                />
              </>
            )}
          </div>
        </div>
        <div
          ref={setOverlayRoot}
          className="pointer-events-none absolute inset-0 z-[110] overflow-visible"
        />
      </SheetContent>
    </Sheet>
  );
}
