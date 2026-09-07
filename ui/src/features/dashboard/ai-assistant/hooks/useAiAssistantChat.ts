import { useCallback, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  confirmAssistantAction,
  fetchAiAssistantConversationMessages,
  type ChatAttachmentMeta,
  type ChatBlock,
  type PageContext,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import {
  buildTurnProgressFromStreamEvent,
  humanizeAssistantStreamError,
  isAbortError,
  isInterruptedStreamError,
  streamChatMessage,
  AssistantStreamAbortedError,
  AssistantStreamInterruptedError,
  type AssistantAppliedEffect,
  type AssistantStreamEvent,
  type TurnProgressLiveState,
} from '@/features/dashboard/ai-assistant/lib/assistantStream';
import type { AttachedContextItem } from '@/features/dashboard/ai-assistant/lib/attachedContext';
import type { ChatSendInput } from '@/features/dashboard/ai-assistant/lib/chatAttachments';
import {
  hostFacingUserMessageText,
  patchActionConfirmationStatus,
  patchDynamicFormStatus,
} from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';
import { useOrgScopeKey, useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';

export type ChatThreadMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string | null;
  blocks: ChatBlock[];
  attachments?: ChatAttachmentMeta[];
  attachedContext?: AttachedContextItem[];
};

const settingsQueryPrefix = (orgSlug: string | null, orgId: string | null) =>
  ['org', orgSlug ?? orgId, 'ai-dashboard-assistant-settings'] as const;

export function useAiAssistantChat(pageContext: PageContext) {
  const orgSlug = useOrgSlugParam();
  const { orgId } = useOrgScopeKey();
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStartedAtMs, setSendStartedAtMs] = useState<number | null>(null);
  const [turnProgress, setTurnProgress] = useState<TurnProgressLiveState | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [partialCancelEffects, setPartialCancelEffects] = useState<AssistantAppliedEffect[] | null>(
    null
  );
  const [upgradeHook, setUpgradeHook] = useState(false);

  const invalidateUsage = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: settingsQueryPrefix(orgSlug, orgId) });
  }, [queryClient, orgSlug, orgId]);

  const loadConversation = useCallback(async (id: string) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setSendStartedAtMs(null);
    setTurnProgress(null);
    setStreamingText('');
    setPending(true);
    setError(null);
    try {
      const { messages: rows } = await fetchAiAssistantConversationMessages(id);
      setConversationId(id);
      setMessages(
        rows.map((row) => ({
          id: row.id,
          role: row.role,
          text:
            row.role === 'user' ? hostFacingUserMessageText(row.content_text) : row.content_text,
          blocks: row.blocks,
          attachments: row.attachments,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setPending(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setConversationId(null);
    setMessages([]);
    setError(null);
    setUpgradeHook(false);
    setSending(false);
    setSendStartedAtMs(null);
    setTurnProgress(null);
    setStreamingText('');
    setPartialCancelEffects(null);
    setPending(false);
  }, []);

  const cancelTurn = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runTurn = useCallback(
    async (
      payload: ChatSendInput,
      options?: { skipUserBubble?: boolean; regenerate?: boolean; localUserId?: string }
    ) => {
      const text = (payload.text ?? '').trim();
      const displayText = (payload.displayText ?? text).trim();
      const attachments = payload.attachments ?? [];
      if (!orgSlug || (!text && attachments.length === 0)) return;
      if (options?.regenerate && !conversationId) return;

      setPending(true);
      setSending(true);
      setSendStartedAtMs(Date.now());
      setTurnProgress(null);
      setStreamingText('');
      setError(null);
      setPartialCancelEffects(null);
      setUpgradeHook(false);

      const attachedContext = payload.attachedContext ?? [];
      let localUserId = options?.localUserId;
      if (!options?.skipUserBubble) {
        localUserId = `local-${Date.now()}`;
        const userMessage: ChatThreadMessage = {
          id: localUserId,
          role: 'user',
          text: displayText || null,
          blocks: displayText ? [{ type: 'text', text: displayText }] : [],
          attachments: attachments.map(({ name, mimeType }) => ({ name, mimeType })),
          attachedContext: attachedContext.length > 0 ? attachedContext : undefined,
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const applySuccessfulTurn = (res: {
        conversationId: string;
        blocks: ChatBlock[];
        upgradeHook?: boolean;
      }) => {
        setConversationId(res.conversationId);
        setUpgradeHook(Boolean(res.upgradeHook));
        setMessages((prev) => [
          ...prev,
          { id: `assistant-${Date.now()}`, role: 'assistant', text: null, blocks: res.blocks },
        ]);
        invalidateUsage();
      };

      const streamHandlers = {
        signal: controller.signal,
        onEvent: (event: AssistantStreamEvent) => {
          if (event.type === 'turn_started' && event.conversationId) {
            setConversationId(event.conversationId);
            return;
          }
          if (event.type === 'text_start') {
            setStreamingText('');
            return;
          }
          if (event.type === 'text_chunk') {
            setStreamingText((prev) => prev + event.delta);
            return;
          }
          setTurnProgress((prev) => buildTurnProgressFromStreamEvent(prev, event));
        },
      };

      try {
        const res = await streamChatMessage(
          {
            orgSlug,
            conversationId,
            pageContext,
            attachedContext: attachedContext.length > 0 ? attachedContext : undefined,
            message: text,
            displayMessage: displayText || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            regenerate: options?.regenerate === true,
          },
          streamHandlers
        );
        applySuccessfulTurn(res);
      } catch (err) {
        if (isAbortError(err)) {
          if (err instanceof AssistantStreamAbortedError && err.appliedEffects?.length) {
            setPartialCancelEffects(err.appliedEffects);
          }
          if (conversationId) {
            try {
              const { messages: rows } = await fetchAiAssistantConversationMessages(conversationId);
              setMessages(
                rows.map((row) => ({
                  id: row.id,
                  role: row.role,
                  text:
                    row.role === 'user'
                      ? hostFacingUserMessageText(row.content_text)
                      : row.content_text,
                  blocks: row.blocks,
                  attachments: row.attachments,
                }))
              );
            } catch {
              if (localUserId) {
                setMessages((prev) => prev.filter((msg) => msg.id !== localUserId));
              }
            }
          } else if (localUserId) {
            setMessages((prev) => prev.filter((msg) => msg.id !== localUserId));
          }
          return;
        }

        // Local `functions serve` hot-reload (and similar) cuts SSE mid-flight —
        // recover once via regenerate so the host doesn't see a raw "network error".
        const retryConversationId =
          (err instanceof AssistantStreamInterruptedError ? err.conversationId : null) ||
          conversationId;
        const canAutoRetry =
          isInterruptedStreamError(err) &&
          Boolean(retryConversationId) &&
          options?.regenerate !== true &&
          attachments.length === 0 &&
          !controller.signal.aborted;

        if (canAutoRetry && retryConversationId) {
          try {
            setTurnProgress(null);
            setStreamingText('');
            // Brief pause so local functions serve can finish hot-reloading.
            await new Promise<void>((resolve) => setTimeout(resolve, 1200));
            if (controller.signal.aborted) return;
            const retry = await streamChatMessage(
              {
                orgSlug,
                conversationId: retryConversationId,
                pageContext,
                attachedContext: attachedContext.length > 0 ? attachedContext : undefined,
                message: text,
                regenerate: true,
              },
              streamHandlers
            );
            applySuccessfulTurn(retry);
            return;
          } catch (retryErr) {
            if (isAbortError(retryErr)) return;
            setError(humanizeAssistantStreamError(retryErr));
            if (retryErr instanceof Error && 'upgradeHook' in retryErr && retryErr.upgradeHook) {
              setUpgradeHook(true);
            }
            return;
          }
        }

        setError(humanizeAssistantStreamError(err));
        if (err instanceof Error && 'upgradeHook' in err && err.upgradeHook) {
          setUpgradeHook(true);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setSending(false);
        setSendStartedAtMs(null);
        setTurnProgress(null);
        setStreamingText('');
        setPending(false);
      }
    },
    [orgSlug, conversationId, pageContext, invalidateUsage]
  );

  const sendMessage = useCallback(
    async (input: string | ChatSendInput) => {
      const payload: ChatSendInput = typeof input === 'string' ? { text: input } : input;
      await runTurn(payload);
    },
    [runTurn]
  );

  /** Marks an in-thread dynamic_form as submitted (read-only recap), then sends the filled values as the next turn. */
  const submitDynamicForm = useCallback(
    async (formId: string, values: Record<string, string>, payload: ChatSendInput) => {
      setMessages((prev) =>
        prev.map((msg) => ({ ...msg, blocks: patchDynamicFormStatus(msg.blocks, formId, values) }))
      );
      await runTurn(payload);
    },
    [runTurn]
  );

  const regenerateLastTurn = useCallback(async () => {
    if (sending || pending) return;
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0) return;
    const userMsg = messages[lastUserIndex];
    if (userMsg.attachments?.length) {
      setError('Regenerate is not available for messages with attachments.');
      return;
    }
    if (!(userMsg.text ?? '').trim()) {
      setError('Regenerate is not available for empty messages.');
      return;
    }
    setMessages((prev) => prev.slice(0, lastUserIndex + 1));
    await runTurn(
      {
        text: userMsg.text ?? '',
        attachedContext: userMsg.attachedContext,
      },
      { skipUserBubble: true, regenerate: true }
    );
  }, [messages, runTurn, sending, pending]);

  const resolveAction = useCallback(async (actionId: string, confirm: boolean) => {
    setPending(true);
    try {
      const result = await confirmAssistantAction({ actionId, confirm });
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          blocks:
            result.status === 'pending'
              ? msg.blocks
              : patchActionConfirmationStatus(
                  msg.blocks,
                  actionId,
                  result.status,
                  result.ok === false ? result.error : undefined
                ),
        }))
      );
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve action');
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const canRegenerate = (() => {
    if (sending || pending || messages.length < 2) return false;
    if (messages[messages.length - 1]?.role !== 'assistant') return false;
    for (let i = messages.length - 2; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user') {
        return !messages[i].attachments?.length && Boolean((messages[i].text ?? '').trim());
      }
    }
    return false;
  })();

  return {
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
  };
}
