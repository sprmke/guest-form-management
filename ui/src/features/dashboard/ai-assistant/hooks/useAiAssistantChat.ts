import { useCallback, useState } from 'react';

import {
  confirmAssistantAction,
  fetchAiAssistantConversationMessages,
  sendChatMessage,
  type ChatAttachmentMeta,
  type ChatBlock,
  type PageContext,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import type { AttachedContextItem } from '@/features/dashboard/ai-assistant/lib/attachedContext';
import type { ChatSendInput } from '@/features/dashboard/ai-assistant/lib/chatAttachments';
import { patchActionConfirmationStatus } from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';
import { useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';

export type ChatThreadMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string | null;
  blocks: ChatBlock[];
  attachments?: ChatAttachmentMeta[];
  attachedContext?: AttachedContextItem[];
};

export function useAiAssistantChat(pageContext: PageContext) {
  const orgSlug = useOrgSlugParam();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeHook, setUpgradeHook] = useState(false);

  const loadConversation = useCallback(async (id: string) => {
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
    setConversationId(null);
    setMessages([]);
    setError(null);
    setUpgradeHook(false);
    setSending(false);
    setPending(false);
  }, []);

  const sendMessage = useCallback(
    async (input: string | ChatSendInput) => {
      const payload: ChatSendInput = typeof input === 'string' ? { text: input } : input;
      const text = (payload.text ?? '').trim();
      const attachments = payload.attachments ?? [];
      if (!orgSlug || (!text && attachments.length === 0)) return;
      setPending(true);
      setSending(true);
      setError(null);
      setUpgradeHook(false);

      const attachedContext = payload.attachedContext ?? [];
      const userMessage: ChatThreadMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        text: text || null,
        blocks: text ? [{ type: 'text', text }] : [],
        attachments: attachments.map(({ name, mimeType }) => ({ name, mimeType })),
        attachedContext: attachedContext.length > 0 ? attachedContext : undefined,
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const res = await sendChatMessage({
          orgSlug,
          conversationId,
          pageContext,
          attachedContext: attachedContext.length > 0 ? attachedContext : undefined,
          message: text,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        setConversationId(res.conversationId);
        setUpgradeHook(Boolean(res.upgradeHook));
        setMessages((prev) => [
          ...prev,
          { id: `assistant-${Date.now()}`, role: 'assistant', text: null, blocks: res.blocks },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setSending(false);
        setPending(false);
      }
    },
    [orgSlug, conversationId, pageContext]
  );

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

  return {
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
  };
}
