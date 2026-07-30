import { useCallback, useEffect, useRef } from 'react';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import {
  completeMetaOAuthPage,
  disconnectMetaInbox,
  fetchInboxAutomationSettings,
  fetchInboxConnections,
  fetchInboxMessages,
  fetchInboxTemplates,
  fetchInboxThreads,
  fetchMetaOAuthPages,
  markInboxConversationRead,
  patchInboxAutomationSettings,
  saveInboxTemplate,
  deleteInboxTemplate,
  editInboxMessage,
  sendInboxReply,
  unsendInboxMessage,
  startMetaInboxOAuth,
  suggestInboxAiReply,
  runMetaInboxBackfillChunk,
  type InboxApiScope,
  type InboxThreadsPageParam,
} from '@/features/dashboard/inbox/lib/inboxApi';
import { isInboxMockMode } from '@/features/dashboard/inbox/lib/inboxMockMode';
import {
  mockAiSuggest,
  mockConnectMeta,
  mockDeleteTemplate,
  mockDisconnectMeta,
  mockFetchAutomation,
  mockFetchConnections,
  mockFetchMessages,
  mockFetchTemplates,
  mockFetchThreads,
  mockMarkRead,
  mockPatchAutomation,
  mockSaveTemplate,
  mockSendReply,
  resetInboxMockStore,
} from '@/features/dashboard/inbox/lib/inboxMockStore';
import {
  ensureInboxNotificationPermission,
  notifyInboxNewMessage,
} from '@/features/dashboard/inbox/lib/inboxNotifications';
import {
  inboxFiltersBlockMetaScrollSync,
  inboxPageExhaustedInDb,
} from '@/features/dashboard/inbox/lib/inboxThreadPagination';
import type {
  InboxConversation,
  SaveInboxTemplatePayload,
  ThreadPlatformFilter,
  ThreadStatusFilter,
  ThreadTypeFilter,
} from '@/features/dashboard/inbox/types/inbox';

import {
  markDirectionMessagesDeliveredInCache,
  markDirectionMessagesReadInCache,
  patchSocialMessageInInfiniteCache,
  type SocialMessageRealtimeRow,
} from '@/lib/chat/chatMessageCache';
import { useChatReadReceiptSync } from '@/lib/chat/useChatReadReceiptSync';
import { supabase } from '@/lib/supabase/client';

export const INBOX_THREADS_KEY = 'inbox-threads';
export const INBOX_MESSAGES_KEY = 'inbox-messages';
export const INBOX_CONNECTIONS_KEY = 'inbox-connections';
export const INBOX_TEMPLATES_KEY = 'inbox-templates';
export const INBOX_SETTINGS_KEY = 'inbox-settings';
export const META_OAUTH_PAGES_KEY = 'meta-oauth-pages';

type InboxThreadsPage = {
  conversations: InboxConversation[];
  nextCursor: string | null;
  metaHasMore: boolean;
  /** True when this page ran a Meta backfill chunk before listing. */
  syncedFromMeta?: boolean;
  syncedInChunk?: number;
};

const REALTIME_INVALIDATE_MS = 400;

function emptyInboxThreadsData(): InfiniteData<InboxThreadsPage> {
  return {
    pages: [{ conversations: [], nextCursor: null, metaHasMore: false }],
    pageParams: [null],
  };
}

function clearInboxThreadCaches(qc: QueryClient) {
  if (threadsInvalidateTimer) {
    clearTimeout(threadsInvalidateTimer);
    threadsInvalidateTimer = null;
  }
  if (inboxInvalidateTimer) {
    clearTimeout(inboxInvalidateTimer);
    inboxInvalidateTimer = null;
  }
  void qc.cancelQueries({ queryKey: [INBOX_THREADS_KEY] });
  void qc.cancelQueries({ queryKey: [INBOX_MESSAGES_KEY] });
  qc.setQueriesData<InfiniteData<InboxThreadsPage>>(
    { queryKey: [INBOX_THREADS_KEY] },
    emptyInboxThreadsData()
  );
  void qc.removeQueries({ queryKey: [INBOX_MESSAGES_KEY] });
}

let threadsInvalidateTimer: ReturnType<typeof setTimeout> | null = null;
let inboxInvalidateTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleThreadsInvalidate(qc: QueryClient) {
  if (threadsInvalidateTimer) clearTimeout(threadsInvalidateTimer);
  threadsInvalidateTimer = setTimeout(() => {
    threadsInvalidateTimer = null;
    void qc.invalidateQueries({ queryKey: [INBOX_THREADS_KEY] });
  }, REALTIME_INVALIDATE_MS);
}

function scheduleInboxInvalidate(qc: QueryClient) {
  if (inboxInvalidateTimer) clearTimeout(inboxInvalidateTimer);
  inboxInvalidateTimer = setTimeout(() => {
    inboxInvalidateTimer = null;
    void qc.invalidateQueries({ queryKey: [INBOX_THREADS_KEY] });
    void qc.invalidateQueries({ queryKey: [INBOX_MESSAGES_KEY] });
  }, REALTIME_INVALIDATE_MS);
}

const mockMode = isInboxMockMode();

if (mockMode) {
  resetInboxMockStore();
}

function inboxScopeKey(scope?: InboxApiScope | null): [string | null, string | null] {
  return [scope?.propertyId ?? null, scope?.parkingId ?? null];
}

function inboxMessagesQueryKey(conversationId: string, scope?: InboxApiScope | null) {
  return [INBOX_MESSAGES_KEY, conversationId, ...inboxScopeKey(scope), mockMode] as const;
}

export function useInboxMockActive(): boolean {
  return mockMode;
}

export function useInboxConnections(
  orgSlug: string | null,
  orgId: string | null,
  scope?: InboxApiScope | null
) {
  return useQuery({
    queryKey: [INBOX_CONNECTIONS_KEY, orgSlug, orgId, ...inboxScopeKey(scope), mockMode],
    queryFn: () =>
      mockMode ? mockFetchConnections() : fetchInboxConnections(orgSlug, orgId, scope),
    enabled: mockMode || !!(orgSlug || orgId),
    refetchInterval: (query) => {
      if (mockMode) return false;
      return query.state.data?.metaSyncInProgress ? 5000 : false;
    },
  });
}

const metaSyncAbortByOrg = new Map<string, AbortController>();

/** First Meta page only after connect — further pages load on scroll. */
export function useMetaInboxSync(
  orgSlug: string | null,
  orgId: string | null,
  metaSyncInProgress: boolean
): { active: boolean } {
  const qc = useQueryClient();

  useEffect(() => {
    if (mockMode || !orgId || !orgSlug || !metaSyncInProgress) return;

    metaSyncAbortByOrg.get(orgId)?.abort();
    const abort = new AbortController();
    metaSyncAbortByOrg.set(orgId, abort);

    void (async () => {
      try {
        if (abort.signal.aborted) return;
        await runMetaInboxBackfillChunk(orgSlug, orgId);
      } catch {
        await runMetaInboxBackfillChunk(orgSlug, orgId, { finalize: true }).catch(() => undefined);
      } finally {
        if (metaSyncAbortByOrg.get(orgId) === abort) {
          metaSyncAbortByOrg.delete(orgId);
        }
        if (!abort.signal.aborted) {
          void qc.invalidateQueries({ queryKey: [INBOX_CONNECTIONS_KEY] });
          void qc.invalidateQueries({ queryKey: [INBOX_THREADS_KEY] });
        }
      }
    })();

    return () => {
      abort.abort();
      if (metaSyncAbortByOrg.get(orgId) === abort) {
        metaSyncAbortByOrg.delete(orgId);
      }
    };
  }, [metaSyncInProgress, orgId, orgSlug, qc]);

  return { active: metaSyncInProgress };
}

export function useInboxMutations(
  orgSlug: string | null,
  orgId: string | null,
  scope?: InboxApiScope | null
) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [INBOX_CONNECTIONS_KEY] });
    void qc.invalidateQueries({ queryKey: [INBOX_THREADS_KEY] });
    void qc.invalidateQueries({ queryKey: [INBOX_MESSAGES_KEY] });
  };

  const connectMeta = useMutation({
    mutationFn: (returnPath: string) =>
      mockMode ? mockConnectMeta() : startMetaInboxOAuth(orgSlug, orgId, returnPath, scope),
    onSuccess: (url) => {
      if (!mockMode) window.location.href = url;
      else invalidate();
    },
  });

  const disconnectMeta = useMutation({
    mutationFn: () =>
      mockMode ? mockDisconnectMeta() : disconnectMetaInbox(orgSlug, orgId, 'meta', scope),
    onMutate: async () => {
      if (orgId) {
        metaSyncAbortByOrg.get(orgId)?.abort();
        metaSyncAbortByOrg.delete(orgId);
      }
      clearInboxThreadCaches(qc);
    },
    onSuccess: () => {
      clearInboxThreadCaches(qc);
      void qc.invalidateQueries({ queryKey: [INBOX_CONNECTIONS_KEY] });
    },
  });

  const sendReply = useMutation({
    mutationFn: (opts: {
      conversationId: string;
      text: string;
      privateReply?: boolean;
      replyToMessageId?: string;
    }) =>
      mockMode
        ? mockSendReply(opts.conversationId, opts.text, opts.privateReply).then(() => undefined)
        : sendInboxReply(orgSlug, orgId, opts.conversationId, opts.text, {
            privateReply: opts.privateReply,
            replyToMessageId: opts.replyToMessageId,
            scope,
          }),
    onMutate: async (vars) => {
      const msgKey = inboxMessagesQueryKey(vars.conversationId, scope);
      await qc.cancelQueries({ queryKey: msgKey });
      const prev = qc.getQueryData<{
        pages: Array<{ messages: unknown[]; conversation: unknown }>;
      }>(msgKey);
      if (prev?.pages?.length && !mockMode) {
        const lastPage = prev.pages[prev.pages.length - 1];
        qc.setQueryData(msgKey, {
          ...prev,
          pages: [
            ...prev.pages.slice(0, -1),
            {
              ...lastPage,
              messages: [
                ...lastPage.messages,
                {
                  id: `optimistic-${Date.now()}`,
                  conversation_id: vars.conversationId,
                  direction: 'outbound',
                  body_text: vars.text,
                  attachments: [],
                  sent_at: new Date().toISOString(),
                  delivery_status: 'sending',
                  is_ai_generated: false,
                },
              ],
            },
          ],
        });
      }
      return { prev };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev && !mockMode) {
        qc.setQueryData(inboxMessagesQueryKey(vars.conversationId, scope), ctx.prev);
      }
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: inboxMessagesQueryKey(vars.conversationId, scope) });
      scheduleThreadsInvalidate(qc);
    },
  });

  const aiSuggest = useMutation({
    mutationFn: (conversationId: string) =>
      mockMode
        ? mockAiSuggest(conversationId)
        : suggestInboxAiReply(orgSlug, orgId, conversationId),
  });

  const editMessage = useMutation({
    mutationFn: (opts: { conversationId: string; messageId: string; text: string }) =>
      mockMode
        ? Promise.reject(new Error('Edit not available in preview mode'))
        : editInboxMessage(orgSlug, orgId, opts.conversationId, opts.messageId, opts.text, scope),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: inboxMessagesQueryKey(vars.conversationId, scope) });
      scheduleThreadsInvalidate(qc);
    },
  });

  const unsendMessage = useMutation({
    mutationFn: (opts: { conversationId: string; messageId: string }) =>
      mockMode
        ? Promise.reject(new Error('Unsend not available in preview mode'))
        : unsendInboxMessage(orgSlug, orgId, opts.conversationId, opts.messageId, scope),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: inboxMessagesQueryKey(vars.conversationId, scope) });
      scheduleThreadsInvalidate(qc);
    },
  });

  return { connectMeta, disconnectMeta, sendReply, editMessage, unsendMessage, aiSuggest };
}

export function useMetaOAuthPagePicker(
  orgSlug: string | null,
  orgId: string | null,
  pickerState: string | null
) {
  const qc = useQueryClient();

  const pagesQuery = useQuery({
    queryKey: [META_OAUTH_PAGES_KEY, orgSlug, orgId, pickerState, mockMode],
    queryFn: () => fetchMetaOAuthPages(orgSlug, orgId, pickerState!),
    enabled: !mockMode && !!(orgSlug || orgId) && !!pickerState,
    retry: false,
  });

  const complete = useMutation({
    mutationFn: (pageId: string) => completeMetaOAuthPage(orgSlug, orgId, pickerState!, pageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [INBOX_CONNECTIONS_KEY] });
      void qc.invalidateQueries({ queryKey: [INBOX_THREADS_KEY] });
    },
  });

  return { pagesQuery, complete };
}

export function useInboxThreads(
  orgSlug: string | null,
  orgId: string | null,
  filters: {
    type: ThreadTypeFilter;
    status: ThreadStatusFilter;
    platform: ThreadPlatformFilter;
    search: string;
  },
  scope?: InboxApiScope | null
) {
  const qc = useQueryClient();

  return useInfiniteQuery({
    queryKey: [INBOX_THREADS_KEY, orgSlug, orgId, ...inboxScopeKey(scope), filters, mockMode],
    queryFn: async ({ pageParam }): Promise<InboxThreadsPage> => {
      if (mockMode) {
        return mockFetchThreads(filters);
      }

      const isSyncPage = pageParam && typeof pageParam === 'object' && pageParam.mode === 'sync';

      let metaHasMore = false;
      let syncedInChunk = 0;
      if (isSyncPage) {
        const backfill = await runMetaInboxBackfillChunk(orgSlug, orgId, { light: true });
        metaHasMore = backfill.metaHasMore;
        syncedInChunk = backfill.syncedInChunk;
        void qc.invalidateQueries({ queryKey: [INBOX_CONNECTIONS_KEY] });
      }

      const list = await fetchInboxThreads(
        orgSlug,
        orgId,
        {
          ...filters,
          cursor: isSyncPage ? pageParam.cursor : typeof pageParam === 'string' ? pageParam : null,
        },
        scope
      );

      return {
        ...list,
        metaHasMore: isSyncPage ? metaHasMore : list.metaHasMore,
        syncedFromMeta: Boolean(isSyncPage),
        syncedInChunk: isSyncPage ? syncedInChunk : undefined,
      };
    },
    initialPageParam: null as InboxThreadsPageParam,
    getNextPageParam: (last, allPages): InboxThreadsPageParam | undefined => {
      if (last.nextCursor) return last.nextCursor;

      if (inboxFiltersBlockMetaScrollSync(filters)) return undefined;

      if (!last.metaHasMore) return undefined;

      if (inboxPageExhaustedInDb(last.conversations.length) && !last.syncedFromMeta) {
        return undefined;
      }

      const prevCount = allPages.slice(0, -1).flatMap((p) => p.conversations).length;
      const totalCount = allPages.flatMap((p) => p.conversations).length;
      const added = totalCount - prevCount;

      if (
        last.syncedFromMeta &&
        added === 0 &&
        !last.nextCursor &&
        (last.syncedInChunk ?? 0) === 0
      ) {
        return undefined;
      }

      const all = allPages.flatMap((p) => p.conversations);
      const tail = all[all.length - 1];
      return { mode: 'sync', cursor: tail?.last_message_at ?? null };
    },
    enabled: mockMode || !!(orgSlug || orgId),
    refetchInterval: false,
    retry: 1,
  });
}

export function useInboxMessages(
  orgSlug: string | null,
  orgId: string | null,
  conversationId: string | null,
  scope?: InboxApiScope | null
) {
  const qc = useQueryClient();
  const msgKey = conversationId ? inboxMessagesQueryKey(conversationId, scope) : null;
  const query = useInfiniteQuery({
    queryKey: msgKey ?? [INBOX_MESSAGES_KEY, null, ...inboxScopeKey(scope), mockMode],
    queryFn: ({ pageParam }) =>
      mockMode
        ? mockFetchMessages(conversationId!)
        : fetchInboxMessages(orgSlug, orgId, conversationId!, pageParam, scope),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.hasMore && last.messages.length > 0 ? last.messages[0]?.sent_at : undefined,
    enabled: (mockMode || !!(orgSlug || orgId)) && !!conversationId,
  });

  const refreshMessages = useCallback(() => {
    if (!conversationId || !msgKey) return;
    void qc.refetchQueries({ queryKey: msgKey });
  }, [conversationId, msgKey, qc]);

  const applyGuestReadToCache = useCallback(
    (readAt: string) => {
      if (!conversationId || !msgKey) return;
      markDirectionMessagesReadInCache(qc, msgKey, 'outbound', readAt);
    },
    [conversationId, msgKey, qc]
  );

  const applyGuestDeliveredToCache = useCallback(() => {
    if (!conversationId || !msgKey) return;
    markDirectionMessagesDeliveredInCache(qc, msgKey, 'outbound');
  }, [conversationId, msgKey, qc]);

  const { notifyPeerRead, notifyPeerDelivered } = useChatReadReceiptSync(
    conversationId,
    'host',
    applyGuestReadToCache,
    applyGuestDeliveredToCache,
    !mockMode && !!conversationId
  );

  useInboxConversationReadRealtime(orgId, conversationId, qc, notifyPeerDelivered);

  useEffect(() => {
    if (!conversationId) return;
    if (mockMode) {
      void mockMarkRead(conversationId).then(() => {
        scheduleThreadsInvalidate(qc);
      });
      return;
    }
    if (!orgId) return;
    void markInboxConversationRead(orgSlug, orgId, conversationId, scope).then(async () => {
      await notifyPeerRead();
      scheduleThreadsInvalidate(qc);
      refreshMessages();
    });
  }, [conversationId, orgId, orgSlug, scope, qc, notifyPeerRead, refreshMessages]);

  return query;
}

function useInboxConversationReadRealtime(
  orgId: string | null,
  conversationId: string | null,
  qc: QueryClient,
  onGuestMessageReceived?: () => void | Promise<void>
) {
  const onGuestMessageReceivedRef = useRef(onGuestMessageReceived);
  onGuestMessageReceivedRef.current = onGuestMessageReceived;

  useEffect(() => {
    if (mockMode || !orgId || !conversationId) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) return;

      await supabase.realtime.setAuth(token);

      channel = supabase
        .channel(`inbox-conversation-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'social_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as { direction?: string };
            if (row.direction === 'inbound') {
              void onGuestMessageReceivedRef.current?.();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'social_conversations',
            filter: `id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as { guest_last_read_at?: string | null };
            const prev = payload.old as { guest_last_read_at?: string | null };
            const readAt = row.guest_last_read_at?.trim();
            if (!readAt || readAt === prev.guest_last_read_at) return;
            markDirectionMessagesReadInCache(
              qc,
              [INBOX_MESSAGES_KEY, conversationId, mockMode],
              'outbound',
              readAt
            );
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, orgId, qc]);
}

export function useInboxRealtime(orgId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (mockMode || !orgId) return;

    void ensureInboxNotificationPermission();

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) return;

      await supabase.realtime.setAuth(token);

      channel = supabase
        .channel(`inbox-${orgId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'social_messages',
            filter: `organization_id=eq.${orgId}`,
          },
          (payload) => {
            scheduleInboxInvalidate(qc);
            const row = payload.new as { direction?: string; body_text?: string | null };
            if (row.direction === 'inbound') {
              const preview = row.body_text?.trim().slice(0, 120) || 'New message';
              notifyInboxNewMessage({
                title: 'Guest Inbox',
                body: preview,
                tag: `inbox-${orgId}`,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'social_messages',
            filter: `organization_id=eq.${orgId}`,
          },
          (payload) => {
            const row = payload.new as SocialMessageRealtimeRow;
            if (!row?.id || !row.conversation_id) {
              scheduleInboxInvalidate(qc);
              return;
            }
            const patched = patchSocialMessageInInfiniteCache(
              qc,
              [INBOX_MESSAGES_KEY, row.conversation_id, mockMode],
              row
            );
            if (!patched) scheduleInboxInvalidate(qc);
            scheduleThreadsInvalidate(qc);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'social_conversations',
            filter: `organization_id=eq.${orgId}`,
          },
          () => scheduleThreadsInvalidate(qc)
        )
        .subscribe();

      if (cancelled && channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token || cancelled) return;
      void supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [orgId, qc]);
}

export function useInboxTemplates(orgSlug: string | null, orgId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [INBOX_TEMPLATES_KEY, orgSlug, orgId, mockMode],
    queryFn: () => (mockMode ? mockFetchTemplates() : fetchInboxTemplates(orgSlug, orgId)),
    enabled: mockMode || !!(orgSlug || orgId),
  });

  const save = useMutation({
    mutationFn: (payload: SaveInboxTemplatePayload) =>
      mockMode ? mockSaveTemplate(payload) : saveInboxTemplate(orgSlug, orgId, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [INBOX_TEMPLATES_KEY] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      mockMode ? mockDeleteTemplate(id) : deleteInboxTemplate(orgSlug, orgId, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [INBOX_TEMPLATES_KEY] }),
  });

  return { ...query, save, remove };
}

export function useInboxAutomationSettings(
  orgSlug: string | null,
  orgId: string | null,
  enabled = true
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [INBOX_SETTINGS_KEY, orgSlug, orgId, mockMode],
    queryFn: () =>
      mockMode ? mockFetchAutomation() : fetchInboxAutomationSettings(orgSlug, orgId),
    enabled: enabled && (mockMode || !!(orgSlug || orgId)),
  });

  const patch = useMutation({
    mutationFn: (patch: Parameters<typeof patchInboxAutomationSettings>[2]) =>
      mockMode ? mockPatchAutomation(patch) : patchInboxAutomationSettings(orgSlug, orgId, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [INBOX_SETTINGS_KEY] }),
  });

  return { ...query, patch };
}
