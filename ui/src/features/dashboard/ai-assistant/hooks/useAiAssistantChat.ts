import { useCallback, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  buildTurnProgressFromStreamEvent,
  isAbortError,
  streamChatMessage,
  type TurnProgressLiveState,
} from '@/features/dashboard/ai-assistant/lib/assistantStream';
import {
  confirmAssistantAction,
  fetchAiAssistantConversationMessages,
  type ChatAttachmentMeta,
  type ChatBlock,
  type PageContext,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import type { AttachedContextItem } from '@/features/dashboard/ai-assistant/lib/attachedContext';
import type { ChatSendInput } from '@/features/dashboard/ai-assistant/lib/chatAttachments';
import { patchActionConfirmationStatus } from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';
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
          text: row.content_text,
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
      const attachments = payload.attachments ?? [];
      if (!orgSlug || (!text && attachments.length === 0)) return;
      if (options?.regenerate && !conversationId) return;

      setPending(true);
      setSending(true);
      setSendStartedAtMs(Date.now());
      setTurnProgress(null);
      setStreamingText('');
      setError(null);
      setUpgradeHook(false);

      const attachedContext = payload.attachedContext ?? [];
      let localUserId = options?.localUserId;
      if (!options?.skipUserBubble) {
        localUserId = `local-${Date.now()}`;
        const userMessage: ChatThreadMessage = {
          id: localUserId,
          role: 'user',
          text: text || null,
          blocks: text ? [{ type: 'text', text }] : [],
          attachments: attachments.map(({ name, mimeType }) => ({ name, mimeType })),
          attachedContext: attachedContext.length > 0 ? attachedContext : undefined,
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await streamChatMessage(
          {
            orgSlug,
            conversationId,
            pageContext,
            attachedContext: attachedContext.length > 0 ? attachedContext : undefined,
            message: text,
            attachments: attachments.length > 0 ? attachments : undefined,
            regenerate: options?.regenerate === true,
          },
          {
            signal: controller.signal,
            onEvent: (event) => {
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
          }
        );
        setConversationId(res.conversationId);
        setUpgradeHook(Boolean(res.upgradeHook));
        setMessages((prev) => [
          ...prev,
          { id: `assistant-${Date.now()}`, role: 'assistant', text: null, blocks: res.blocks },
        ]);
        invalidateUsage();
      } catch (err) {
        if (isAbortError(err)) {
          if (conversationId) {
            try {
              const { messages: rows } = await fetchAiAssistantConversationMessages(conversationId);
              setMessages(
                rows.map((row) => ({
                  id: row.id,
                  role: row.role,
                  text: row.content_text,
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
        setError(err instanceof Error ? err.message : 'Something went wrong');
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
              : patchActionConfirmationStatus(msg.blocks, actionId, result.status),
        }))
      );
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
    upgradeHook,
    canRegenerate,
    sendMessage,
    cancelTurn,
    regenerateLastTurn,
    resolveAction,
    loadConversation,
    startNewConversation,
  };
}
