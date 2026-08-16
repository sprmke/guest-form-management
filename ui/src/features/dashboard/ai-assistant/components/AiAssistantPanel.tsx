import { useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { History, Plus, X } from 'lucide-react';

import { ChatComposer } from '@/features/dashboard/ai-assistant/components/ChatComposer';
import { ChatThread } from '@/features/dashboard/ai-assistant/components/ChatThread';
import { ConversationHistoryList } from '@/features/dashboard/ai-assistant/components/ConversationHistoryList';
import { useAiAssistantChat } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantChat';
import {
  ASSISTANT_ACTIONS,
  ASSISTANT_QUESTIONS,
  SUGGESTION_VISIBLE_COUNT,
  pickRandomSuggestions,
} from '@/features/dashboard/ai-assistant/lib/assistantSuggestions';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isNestedOverlayTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        '[data-radix-popper-content-wrapper], [data-radix-dropdown-menu-content], [role="alertdialog"]'
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
    error,
    upgradeHook,
    sendMessage,
    resolveAction,
    loadConversation,
    startNewConversation,
  } = useAiAssistantChat(pageContext);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setView('chat');
        if (next) setSuggestionNonce((n) => n + 1);
      }}
    >
      <SheetContent
        side="right"
        hideClose
        className="flex w-full min-w-0 flex-col gap-0 p-0 sm:max-w-xl"
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
        <SheetHeader className="border-border/60 flex-row items-center justify-between space-y-0 border-b p-3">
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

        {view === 'history' ? (
          <ConversationHistoryList
            activeConversationId={conversationId}
            onSelect={(id) => {
              void loadConversation(id);
              setComposerKey((n) => n + 1);
              setView('chat');
            }}
            onDeleted={(id) => {
              if (id === conversationId) {
                startNewConversation();
                setComposerKey((n) => n + 1);
              }
            }}
          />
        ) : (
          <>
            <ChatThread
              messages={messages}
              pending={pending}
              onResolveAction={resolveAction}
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
            />
          </>
        )}
        <div
          ref={setOverlayRoot}
          className="pointer-events-none absolute inset-0 z-[110] overflow-visible"
        />
      </SheetContent>
    </Sheet>
  );
}
