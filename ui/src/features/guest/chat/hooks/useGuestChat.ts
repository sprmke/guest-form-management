import { useCallback, useEffect } from 'react';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { GUEST_MESSAGES_QUERY_KEY } from '@/features/guest/account/lib/guestAccountApi';
import {
  editGuestChatMessage,
  fetchGuestChatMessages,
  fetchGuestWebChatResume,
  markGuestChatRead,
  sendGuestChatMessage,
  unsendGuestChatMessage,
  uploadGuestChatAttachment,
  startGuestWebChat,
  type GuestChatAttachment,
  type GuestChatMessage,
  type GuestChatResumeResult,
  type GuestChatStartResult,
} from '@/features/guest/chat/lib/guestChatApi';

import { supabase } from '@/lib/supabase/client';

export const GUEST_CHAT_START_KEY = 'guest-chat-start';
export const GUEST_CHAT_RESUME_KEY = 'guest-chat-resume';
export const GUEST_CHAT_MESSAGES_KEY = 'guest-chat-messages';

type MessagesPage = { messages: GuestChatMessage[]; hasMore: boolean };

type MessagesInfiniteData = {
  pages: MessagesPage[];
  pageParams: unknown[];
};

export type GuestChatSendInput = {
  text: string;
  replyToMessageId?: string;
  attachments?: GuestChatAttachment[];
};

function messagesQueryKey(conversationId: string) {
  return [GUEST_CHAT_MESSAGES_KEY, conversationId] as const;
}

function appendOptimisticMessage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: GuestChatMessage
) {
  const key = messagesQueryKey(conversationId);
  const prev = qc.getQueryData<MessagesInfiniteData>(key);
  if (!prev?.pages?.length) return;

  const lastIndex = prev.pages.length - 1;
  const lastPage = prev.pages[lastIndex];
  if (!lastPage) return;

  qc.setQueryData<MessagesInfiniteData>(key, {
    ...prev,
    pages: [
      ...prev.pages.slice(0, lastIndex),
      { ...lastPage, messages: [...lastPage.messages, message] },
    ],
  });
}

function patchOptimisticMessage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string,
  patch: Partial<GuestChatMessage>
) {
  const key = messagesQueryKey(conversationId);
  const prev = qc.getQueryData<MessagesInfiniteData>(key);
  if (!prev?.pages?.length) return;

  qc.setQueryData<MessagesInfiniteData>(key, {
    ...prev,
    pages: prev.pages.map((page) => ({
      ...page,
      messages: page.messages.map((message) =>
        message.id === messageId ? { ...message, ...patch } : message
      ),
    })),
  });
}

function removeMessageFromCache(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string
) {
  const key = messagesQueryKey(conversationId);
  const prev = qc.getQueryData<MessagesInfiniteData>(key);
  if (!prev?.pages?.length) return;

  qc.setQueryData<MessagesInfiniteData>(key, {
    ...prev,
    pages: prev.pages.map((page) => ({
      ...page,
      messages: page.messages.filter((message) => message.id !== messageId),
    })),
  });
}

function normalizeSendInput(input: GuestChatSendInput | string): GuestChatSendInput {
  if (typeof input === 'string') return { text: input };
  return input;
}

export function useGuestChatResume(input: { propertySlug: string; enabled: boolean }) {
  return useQuery({
    queryKey: [GUEST_CHAT_RESUME_KEY, input.propertySlug],
    queryFn: () => fetchGuestWebChatResume(input.propertySlug),
    enabled: input.enabled && !!input.propertySlug.trim(),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useGuestChatStart(input: {
  propertySlug: string;
  checkInDate: string;
  checkOutDate: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [GUEST_CHAT_START_KEY, input.propertySlug, input.checkInDate, input.checkOutDate],
    queryFn: () =>
      startGuestWebChat({
        propertySlug: input.propertySlug,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
      }),
    enabled:
      input.enabled &&
      !!input.propertySlug.trim() &&
      !!input.checkInDate.trim() &&
      !!input.checkOutDate.trim(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useGuestChatMessages(conversationId: string | null) {
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: messagesQueryKey(conversationId ?? ''),
    queryFn: ({ pageParam }) =>
      fetchGuestChatMessages(conversationId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.hasMore && last.messages.length > 0 ? last.messages[0]?.sent_at : undefined,
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId || query.isLoading) return;
    void markGuestChatRead(conversationId).then(() => {
      void qc.invalidateQueries({ queryKey: GUEST_MESSAGES_QUERY_KEY });
    });
  }, [conversationId, query.isLoading, qc]);

  const send = useMutation({
    mutationFn: (input: GuestChatSendInput | string) => {
      const { text, replyToMessageId, attachments } = normalizeSendInput(input);
      return sendGuestChatMessage(conversationId!, text, { replyToMessageId, attachments });
    },
    onMutate: async (input) => {
      if (!conversationId) return undefined;

      const { text, replyToMessageId, attachments } = normalizeSendInput(input);
      await qc.cancelQueries({ queryKey: messagesQueryKey(conversationId) });
      const prev = qc.getQueryData<MessagesInfiniteData>(messagesQueryKey(conversationId));
      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: GuestChatMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        direction: 'inbound',
        body_text: text,
        attachments: attachments ?? [],
        sent_at: new Date().toISOString(),
        delivery_status: 'sending',
        is_ai_generated: false,
        reply_to_message_id: replyToMessageId ?? null,
      };

      appendOptimisticMessage(qc, conversationId, optimistic);

      return { prev, optimisticId, text };
    },
    onError: (_error, _input, context) => {
      if (!conversationId || !context?.optimisticId) return;
      patchOptimisticMessage(qc, conversationId, context.optimisticId, {
        delivery_status: 'failed',
      });
    },
    onSuccess: () => {
      if (!conversationId) return;
      void qc.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      void qc.invalidateQueries({ queryKey: GUEST_MESSAGES_QUERY_KEY });
    },
  });

  const edit = useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      editGuestChatMessage(conversationId!, messageId, text),
    onSuccess: (message) => {
      if (!conversationId) return;
      patchOptimisticMessage(qc, conversationId, message.id, message);
      void qc.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      void qc.invalidateQueries({ queryKey: GUEST_MESSAGES_QUERY_KEY });
    },
  });

  const unsend = useMutation({
    mutationFn: (messageId: string) => unsendGuestChatMessage(conversationId!, messageId),
    onSuccess: (_, messageId) => {
      if (!conversationId) return;
      patchOptimisticMessage(qc, conversationId, messageId, {
        deleted_at: new Date().toISOString(),
        body_text: null,
        attachments: [],
        edited_at: null,
      });
      void qc.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      void qc.invalidateQueries({ queryKey: GUEST_MESSAGES_QUERY_KEY });
    },
  });

  const uploadAttachment = useMutation({
    mutationFn: (file: File) => uploadGuestChatAttachment(conversationId!, file),
  });

  const retryFailedMessage = useCallback(
    (messageId: string, text: string) => {
      if (!conversationId || !text.trim()) return;
      removeMessageFromCache(qc, conversationId, messageId);
      send.mutate({ text: text.trim() });
    },
    [conversationId, qc, send]
  );

  useGuestChatRealtime(conversationId, qc);

  const messages: GuestChatMessage[] = query.data?.pages.flatMap((page) => page.messages) ?? [];

  return { ...query, messages, send, edit, unsend, uploadAttachment, retryFailedMessage };
}

function useGuestChatRealtime(
  conversationId: string | null,
  qc: ReturnType<typeof useQueryClient>
) {
  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) return;

      await supabase.realtime.setAuth(token);

      const invalidate = () => {
        void qc.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
        void qc.invalidateQueries({ queryKey: GUEST_MESSAGES_QUERY_KEY });
      };

      channel = supabase
        .channel(`guest-chat-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'social_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          invalidate
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'social_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          invalidate
        )
        .subscribe();

      if (cancelled && channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);
}

export type { GuestChatStartResult, GuestChatResumeResult, GuestChatMessage };
