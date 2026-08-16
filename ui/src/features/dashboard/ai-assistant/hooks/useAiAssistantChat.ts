import { useCallback, useState } from 'react';

import {
  confirmAssistantAction,
  fetchAiAssistantConversationMessages,
  sendChatMessage,
  type ChatBlock,
  type PageContext,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';


export type ChatThreadMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string | null;
  blocks: ChatBlock[];
};

export function useAiAssistantChat(pageContext: PageContext) {
  const orgSlug = useOrgSlugParam();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [pending, setPending] = useState(false);
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
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!orgSlug || !text.trim()) return;
      setPending(true);
      setError(null);
      setUpgradeHook(false);

      const userMessage: ChatThreadMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        text,
        blocks: [{ type: 'text', text }],
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const res = await sendChatMessage({
          orgSlug,
          conversationId,
          pageContext,
          message: text,
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
          blocks: msg.blocks.map((block) =>
            block.type === 'action_confirmation' && block.actionId === actionId
              ? { ...block, status: result.status === 'pending' ? block.status : result.status }
              : block
          ),
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
    error,
    upgradeHook,
    sendMessage,
    resolveAction,
    loadConversation,
    startNewConversation,
  };
}
