import { useEffect } from 'react';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { GUEST_MESSAGES_QUERY_KEY } from '@/features/guest/account/lib/guestAccountApi';
import {
  fetchGuestChatMessages,
  fetchGuestWebChatResume,
  sendGuestChatMessage,
  startGuestWebChat,
  type GuestChatMessage,
  type GuestChatResumeResult,
  type GuestChatStartResult,
} from '@/features/guest/chat/lib/guestChatApi';

import { supabase } from '@/lib/supabase/client';

export const GUEST_CHAT_START_KEY = 'guest-chat-start';
export const GUEST_CHAT_RESUME_KEY = 'guest-chat-resume';
export const GUEST_CHAT_MESSAGES_KEY = 'guest-chat-messages';

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
    queryKey: [GUEST_CHAT_MESSAGES_KEY, conversationId],
    queryFn: ({ pageParam }) =>
      fetchGuestChatMessages(conversationId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.hasMore && last.messages.length > 0 ? last.messages[0]?.sent_at : undefined,
    enabled: !!conversationId,
  });

  const send = useMutation({
    mutationFn: (text: string) => sendGuestChatMessage(conversationId!, text),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [GUEST_CHAT_MESSAGES_KEY, conversationId] });
      void qc.invalidateQueries({ queryKey: GUEST_MESSAGES_QUERY_KEY });
    },
  });

  useGuestChatRealtime(conversationId, qc);

  const messages: GuestChatMessage[] = query.data?.pages.flatMap((page) => page.messages) ?? [];

  return { ...query, messages, send };
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
          () => {
            void qc.invalidateQueries({ queryKey: [GUEST_CHAT_MESSAGES_KEY, conversationId] });
            void qc.invalidateQueries({ queryKey: GUEST_MESSAGES_QUERY_KEY });
          }
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
