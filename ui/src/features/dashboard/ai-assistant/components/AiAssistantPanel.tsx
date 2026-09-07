import { useCallback, useMemo, useRef, useState } from 'react';

import { useParams } from 'react-router-dom';

import { History, Plus, X } from 'lucide-react';

import { ChatCanvasOverlay } from '@/features/dashboard/ai-assistant/components/ChatCanvasOverlay';
import { ChatComposer } from '@/features/dashboard/ai-assistant/components/ChatComposer';
import { ChatThread } from '@/features/dashboard/ai-assistant/components/ChatThread';
import { ConversationHistoryList } from '@/features/dashboard/ai-assistant/components/ConversationHistoryList';
import { useAiAssistantChat } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantChat';
import { useAiDashboardAssistantSettings } from '@/features/dashboard/ai-assistant/hooks/useAiDashboardAssistantSettings';
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
import type { AttachedContextItem } from '@/features/dashboard/ai-assistant/lib/attachedContext';
import {
  dynamicFormValuesToLines,
  patchActionConfirmationStatus,
} from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';
import { selectContextualSuggestions } from '@/features/dashboard/ai-assistant/lib/moduleSuggestions';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { TierBadge } from '@/features/dashboard/plans/components/TierBadge';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';

import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan gate blocks new messages — past conversation history stays viewable. */
  readOnly?: boolean;
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

export function AiAssistantPanel({ open, onOpenChange, readOnly = false }: Props) {
  const propertyId = usePropertyIdParam();
  const { open: openUpgradeModal } = useUpgradeModal();
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
  const composerContextRef = useRef<AttachedContextItem[]>([]);
  const [pinnedContext, setPinnedContext] = useState<AttachedContextItem[]>([]);
  const canvasOpen = canvasBlock != null;
  const pinnedModuleTypes = useMemo(
    () => Array.from(new Set(pinnedContext.map((item) => item.type))),
    [pinnedContext]
  );
  // Once the host pins context (a booking, a property, a finance item, …), swap the
  // random starter pool for that module's ranked prompts — merged fairly by rank when
  // multiple modules are pinned. Falls back to the random pool when nothing is pinned.
  const questions = useMemo(() => {
    const contextual = selectContextualSuggestions(
      pinnedModuleTypes,
      'question',
      SUGGESTION_VISIBLE_COUNT
    );
    return contextual.length > 0
      ? contextual
      : pickRandomSuggestions(ASSISTANT_QUESTIONS, SUGGESTION_VISIBLE_COUNT);
  }, [pinnedModuleTypes, suggestionNonce]);
  const actions = useMemo(() => {
    const contextual = selectContextualSuggestions(
      pinnedModuleTypes,
      'action',
      SUGGESTION_VISIBLE_COUNT
    );
    return contextual.length > 0
      ? contextual
      : pickRandomSuggestions(ASSISTANT_ACTIONS, SUGGESTION_VISIBLE_COUNT);
  }, [pinnedModuleTypes, suggestionNonce]);

  const {
    conversationId,
    messages,
    pending,
    sending,
    sendStartedAtMs,
    turnProgress,
    streamingText,
    error,
    partialCancelEffects,
    upgradeHook,
    canRegenerate,
    sendMessage,
    submitDynamicForm,
    cancelTurn,
    regenerateLastTurn,
    resolveAction,
    loadConversation,
    startNewConversation,
  } = useAiAssistantChat(pageContext);
  const { data: assistantSettings } = useAiDashboardAssistantSettings({ includeUsage: true });
  const usageLabel =
    assistantSettings?.usage != null
      ? `${assistantSettings.usage.todayMessageCount}/${assistantSettings.dailyMessageLimit}`
      : null;

  const handleResolveAction = useCallback(
    async (actionId: string, confirm: boolean): Promise<ConfirmActionResponse | null> => {
      const result = await resolveAction(actionId, confirm);
      if (result && result.status !== 'pending') {
        const nextStatus = result.status;
        setCanvasBlock((current) => {
          if (!current) return current;
          return (
            patchActionConfirmationStatus(
              [current],
              actionId,
              nextStatus,
              result.ok === false ? result.error : undefined
            )[0] ?? current
          );
        });
      }
      return result;
    },
    [resolveAction]
  );

  const handleRunQuickAction = useCallback(
    (action: { label: string; prompt: string }) => {
      if (readOnly) {
        openUpgradeModal('aiDashboardAssistant');
        return;
      }
      if (sending || pending) return;

      const lastUserContext = [...messages]
        .reverse()
        .find((message) => message.role === 'user')?.attachedContext;
      const attachedContext =
        composerContextRef.current.length > 0 ? composerContextRef.current : lastUserContext;

      void sendMessage({
        // Model guidance stays host-readable (no tool names). Bubble + History store the chip label.
        text: action.prompt,
        displayText: action.label,
        attachedContext,
      });
    },
    [readOnly, sending, pending, messages, sendMessage, openUpgradeModal]
  );

  const handleSubmitDynamicForm = useCallback(
    (block: Extract<ChatBlock, { type: 'dynamic_form' }>, values: Record<string, string>) => {
      if (readOnly) {
        openUpgradeModal('aiDashboardAssistant');
        return;
      }
      if (sending || pending) return;

      const lastUserContext = [...messages]
        .reverse()
        .find((message) => message.role === 'user')?.attachedContext;
      const attachedContext =
        composerContextRef.current.length > 0 ? composerContextRef.current : lastUserContext;

      const lines = dynamicFormValuesToLines(block.fields, values);
      void submitDynamicForm(block.formId, values, {
        text:
          lines.length > 0
            ? `Here are the details you asked for:\n${lines.join('\n')}`
            : 'Submitted.',
        displayText: lines.join('\n') || block.title || 'Submitted',
        attachedContext,
      });
    },
    [readOnly, sending, pending, messages, submitDynamicForm, openUpgradeModal]
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
          <div className="flex min-w-0 items-center gap-2">
            <SheetTitle className="text-base">AI Assistant</SheetTitle>
            <TierBadge feature="aiDashboardAssistant" />
            {usageLabel ? (
              <span
                className="text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 text-xs tabular-nums"
                title="Messages today"
              >
                {usageLabel}
              </span>
            ) : null}
          </div>
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
                if (readOnly) {
                  openUpgradeModal('aiDashboardAssistant');
                  return;
                }
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
              onRunQuickAction={handleRunQuickAction}
              quickActionsDisabled={sending || pending}
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
                  sendStartedAtMs={sendStartedAtMs}
                  turnProgress={turnProgress}
                  streamingText={streamingText}
                  canRegenerate={canRegenerate}
                  onRegenerate={() => {
                    if (readOnly) {
                      openUpgradeModal('aiDashboardAssistant');
                      return;
                    }
                    void regenerateLastTurn();
                  }}
                  onResolveAction={handleResolveAction}
                  onRunQuickAction={handleRunQuickAction}
                  quickActionsDisabled={sending || pending}
                  onOpenCanvas={setCanvasBlock}
                  onSubmitForm={handleSubmitDynamicForm}
                  questions={questions}
                  actions={actions}
                  onPickSuggestion={(prompt) => {
                    if (readOnly) {
                      openUpgradeModal('aiDashboardAssistant');
                      return;
                    }
                    void sendMessage(prompt);
                  }}
                />

                {partialCancelEffects && partialCancelEffects.length > 0 ? (
                  <div
                    className="bg-warning/10 text-warning-foreground mx-3 mb-1 rounded-md px-3 py-2 text-xs"
                    role="status"
                  >
                    <p className="font-medium">Stopped. These changes were already applied:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {partialCancelEffects.map((effect) => (
                        <li key={effect.toolName}>{effect.label}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {error && <p className="text-destructive px-3 pb-1 text-xs">{error}</p>}
                {upgradeHook && (
                  <p className="text-warning px-3 pb-1 text-xs">
                    You&apos;ve hit today&apos;s message limit for the assistant.
                  </p>
                )}

                <ChatComposer
                  key={composerKey}
                  onSend={(input) => {
                    if (readOnly) {
                      openUpgradeModal('aiDashboardAssistant');
                      return;
                    }
                    void sendMessage(input);
                  }}
                  sending={sending}
                  onCancel={cancelTurn}
                  pageBookingId={bookingId}
                  disabled={pending}
                  overlayContainer={overlayRoot}
                  onAttachedContextChange={(items) => {
                    composerContextRef.current = items;
                    setPinnedContext(items);
                  }}
                  onPickSuggestion={(prompt, attachedContext) => {
                    if (readOnly) {
                      openUpgradeModal('aiDashboardAssistant');
                      return;
                    }
                    if (sending || pending) return;
                    void sendMessage({ text: prompt, attachedContext });
                  }}
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
