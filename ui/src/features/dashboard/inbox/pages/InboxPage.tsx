import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { toast } from 'sonner';

import { useAdminLayoutFillMain } from '@/features/dashboard/bookings/components/AdminLayout';
import { bottomTabBarOffsetClassName } from '@/components/mobile/BottomTabBar';
import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { InboxConversationView } from '@/features/dashboard/inbox/components/InboxConversationView';
import {
  InboxManageModals,
  InboxManageToolbar,
  type InboxManageModal,
} from '@/features/dashboard/inbox/components/InboxManageModals';
import { InboxPlatformTabs } from '@/features/dashboard/inbox/components/InboxPlatformTabs';
import { InboxThreadList } from '@/features/dashboard/inbox/components/InboxThreadList';
import { MetaPagePickerDialog } from '@/features/dashboard/inbox/components/MetaPagePickerDialog';
import {
  useInboxAutomationSettings,
  useInboxConnections,
  useInboxMessages,
  useInboxMockActive,
  useInboxMutations,
  useInboxRealtime,
  useInboxTemplates,
  useInboxThreads,
  useMetaInboxSync,
  useMetaOAuthPagePicker,
} from '@/features/dashboard/inbox/hooks/useInbox';
import type { InboxApiScope } from '@/features/dashboard/inbox/lib/inboxApi';
import { metaInboxOAuthErrorMessage } from '@/features/dashboard/inbox/lib/metaInboxOAuthErrors';
import type {
  InboxConversation,
  ThreadPlatformFilter,
  ThreadStatusFilter,
  ThreadTypeFilter,
} from '@/features/dashboard/inbox/types/inbox';

import { cn } from '@/lib/utils';

export type InboxPageProps = {
  kind: 'org' | 'property' | 'parking';
  returnPath: string;
  canReply: boolean;
  canManage: boolean;
  /** Quick replies + Automation — org only */
  showOrgManageTabs: boolean;
  scope?: InboxApiScope | null;
  orgSlug: string | null;
  orgId: string | null;
};

export function InboxPage({
  returnPath,
  canReply,
  canManage,
  showOrgManageTabs,
  scope,
  orgSlug,
  orgId,
}: InboxPageProps) {
  useAdminLayoutFillMain(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [manageModal, setManageModal] = useState<InboxManageModal>(null);
  const [pagePickerState, setPagePickerState] = useState<string | null>(null);
  const conversationIdParam = searchParams.get('conversationId');
  const platformParam = searchParams.get('platform');
  const [selectedId, setSelectedId] = useState<string | null>(() => conversationIdParam);
  const [mobileShowConversation, setMobileShowConversation] = useState(() => !!conversationIdParam);
  const [statusFilter, setStatusFilter] = useState<ThreadStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ThreadTypeFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<ThreadPlatformFilter>(() => {
    if (platformParam === 'web' || platformParam === 'facebook' || platformParam === 'instagram') {
      return platformParam;
    }
    return 'all';
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!conversationIdParam) return;
    setSelectedId(conversationIdParam);
    setMobileShowConversation(true);
    if (platformParam === 'web' || platformParam === 'facebook' || platformParam === 'instagram') {
      setPlatformFilter(platformParam);
    }
  }, [conversationIdParam, platformParam]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowConversation(true);
    const next = new URLSearchParams(searchParams);
    next.set('conversationId', id);
    setSearchParams(next, { replace: true });
  };

  const mockActive = useInboxMockActive();

  useInboxRealtime(orgId);

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    isError: connectionsError,
  } = useInboxConnections(orgSlug, orgId, scope);
  const metaSyncInProgress = connectionsData?.metaSyncInProgress ?? false;
  useMetaInboxSync(orgSlug, orgId, metaSyncInProgress);
  const {
    data: threadsData,
    isLoading: threadsLoading,
    fetchNextPage: fetchMoreThreads,
    hasNextPage: hasMoreThreads,
    isFetchingNextPage: loadingMoreThreads,
  } = useInboxThreads(
    orgSlug,
    orgId,
    {
      type: typeFilter,
      status: statusFilter,
      platform: platformFilter,
      search,
    },
    scope
  );
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage: fetchOlderMessages,
    hasNextPage: hasOlderMessages,
    isFetchingNextPage: loadingOlderMessages,
  } = useInboxMessages(orgSlug, orgId, selectedId, scope);
  const { connectMeta, disconnectMeta, sendReply, editMessage, unsendMessage, aiSuggest } =
    useInboxMutations(orgSlug, orgId, scope);
  const templatesQuery = useInboxTemplates(orgSlug, orgId);
  const automationQuery = useInboxAutomationSettings(orgSlug, orgId, showOrgManageTabs);
  const pagePicker = useMetaOAuthPagePicker(orgSlug, orgId, pagePickerState);

  const conversations = useMemo(() => {
    const seen = new Set<string>();
    const merged: InboxConversation[] = [];
    for (const page of threadsData?.pages ?? []) {
      for (const c of page.conversations) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        merged.push(c);
      }
    }
    return merged;
  }, [threadsData?.pages]);
  const messages = useMemo(() => {
    if (!messagesData?.pages.length) return [];
    return [...messagesData.pages].reverse().flatMap((p) => p.messages);
  }, [messagesData?.pages]);
  const messagesConversation = messagesData?.pages[0]?.conversation ?? null;
  const metaConnected = useMemo(
    () =>
      (connectionsData?.connections ?? []).some(
        (c) =>
          (c.platform === 'facebook' || c.platform === 'instagram') &&
          c.status === 'connected' &&
          !c.isPreview
      ),
    [connectionsData?.connections]
  );
  const metaHasMore =
    connectionsData?.metaHasMore ?? threadsData?.pages.at(-1)?.metaHasMore ?? false;
  const threadEmptyVariant = useMemo(() => {
    if (mockActive) return 'empty' as const;
    if (platformFilter === 'web') return 'empty' as const;
    if (!metaConnected) return 'not-connected' as const;
    if (metaSyncInProgress && conversations.length === 0) return 'syncing' as const;
    if (search) {
      if (metaHasMore) return 'search-not-loaded' as const;
      return 'search-empty' as const;
    }
    return 'empty' as const;
  }, [
    mockActive,
    platformFilter,
    metaConnected,
    metaSyncInProgress,
    conversations.length,
    search,
    metaHasMore,
  ]);

  const handleConnectMeta = () => {
    connectMeta.mutate(returnPath, {
      onSuccess: () => {
        if (mockActive) toast.success('Preview: Meta channels connected');
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? messagesConversation ?? null,
    [conversations, selectedId, messagesConversation]
  );

  useEffect(() => {
    const metaStatus = searchParams.get('meta_inbox');
    const metaError = searchParams.get('meta_inbox_error');
    const metaPicker = searchParams.get('meta_picker');
    if (metaStatus === 'connected') {
      toast.success('Meta channels connected', { id: 'meta-inbox-connected' });
      setManageModal('channels');
    }
    if (metaStatus === 'select_page' && metaPicker) {
      setPagePickerState(metaPicker);
    }
    if (metaError) {
      toast.error(metaInboxOAuthErrorMessage(metaError));
      setManageModal('channels');
    }
    if (metaStatus || metaError || metaPicker) {
      const next = new URLSearchParams(searchParams);
      next.delete('meta_inbox');
      next.delete('meta_inbox_error');
      next.delete('meta_picker');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <AdminMobilePage
      title="Guest Inbox"
      subtitle="View and reply to guest messages from connected channels."
      titleId="inbox-heading"
      heroTrailing={
        <InboxManageToolbar
          canManage={canManage}
          showOrgManageTabs={showOrgManageTabs}
          onOpen={setManageModal}
          variant="hero"
        />
      }
      desktopActions={
        <InboxManageToolbar
          canManage={canManage}
          showOrgManageTabs={showOrgManageTabs}
          onOpen={setManageModal}
        />
      }
      className="flex min-h-0 flex-1 flex-col"
    >
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:min-h-[480px]',
          /* Fill-main skips shell tab `pb` — keep the composer / list above the dock. */
          bottomTabBarOffsetClassName()
        )}
      >
        {mockActive && (
          <div
            className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-950 dark:text-amber-100"
            role="status"
          >
            Preview data — not connected to live platforms. Remove{' '}
            <code className="bg-background/60 rounded px-1">VITE_INBOX_MOCK_DATA</code> or{' '}
            <code className="bg-background/60 rounded px-1">?mock=true</code>.
          </div>
        )}

        <div className="border-border/80 bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
          <InboxPlatformTabs
            value={platformFilter}
            onChange={setPlatformFilter}
            showComingSoonPlatforms={mockActive}
          />

          <div className="flex min-h-0 flex-1">
            <div
              className={cn(
                'border-border/80 flex h-full min-h-0 w-full shrink-0 flex-col border-r lg:w-[min(100%,400px)]',
                mobileShowConversation ? 'hidden lg:flex' : 'flex'
              )}
            >
              <InboxThreadList
                conversations={conversations}
                isLoading={threadsLoading && conversations.length === 0 && !metaSyncInProgress}
                selectedId={selectedId}
                platformFilter={platformFilter}
                onSelect={selectConversation}
                statusFilter={statusFilter}
                typeFilter={typeFilter}
                search={searchInput}
                onStatusFilter={setStatusFilter}
                onTypeFilter={setTypeFilter}
                onSearch={setSearchInput}
                emptyVariant={threadEmptyVariant}
                syncInProgress={metaSyncInProgress}
                canConnect={canManage}
                onConnect={handleConnectMeta}
                hasMore={!!hasMoreThreads}
                loadingMore={loadingMoreThreads}
                onLoadMore={() => void fetchMoreThreads()}
              />
            </div>
            <div
              className={cn(
                'flex h-full min-h-0 min-w-0 flex-1 flex-col',
                mobileShowConversation ? 'flex' : 'hidden lg:flex'
              )}
            >
              <InboxConversationView
                conversation={selectedConversation}
                messages={messages}
                isLoading={messagesLoading && !!selectedId}
                canReply={canReply}
                templates={templatesQuery.data ?? []}
                orgSlug={orgSlug}
                onBack={() => setMobileShowConversation(false)}
                hasOlderMessages={!!hasOlderMessages}
                loadingOlder={loadingOlderMessages}
                onLoadOlder={() => void fetchOlderMessages()}
                onSend={async (text, opts) => {
                  if (!selectedId) return;
                  await sendReply.mutateAsync({
                    conversationId: selectedId,
                    text,
                    privateReply: opts?.privateReply,
                    replyToMessageId: opts?.replyToMessageId,
                  });
                }}
                onEdit={async (messageId, text) => {
                  if (!selectedId) return;
                  await editMessage.mutateAsync({ conversationId: selectedId, messageId, text });
                }}
                onUnsend={async (messageId) => {
                  if (!selectedId) return;
                  await unsendMessage.mutateAsync({ conversationId: selectedId, messageId });
                }}
                onSuggest={async () => {
                  if (!selectedId) throw new Error('No conversation selected');
                  return aiSuggest.mutateAsync(selectedId);
                }}
                sending={sendReply.isPending}
                editing={editMessage.isPending}
                unsending={unsendMessage.isPending}
                suggesting={aiSuggest.isPending}
              />
            </div>
          </div>
        </div>

        <InboxManageModals
          open={manageModal}
          onOpenChange={setManageModal}
          canManage={canManage}
          showOrgManageTabs={showOrgManageTabs}
          usingOrgMeta={connectionsData?.usingOrgMeta}
          connections={connectionsData?.connections ?? []}
          comingSoon={connectionsData?.comingSoon ?? []}
          connectionsLoading={connectionsLoading}
          connectionsError={connectionsError}
          connecting={connectMeta.isPending}
          disconnecting={disconnectMeta.isPending}
          onConnectMeta={handleConnectMeta}
          onDisconnectMeta={() =>
            disconnectMeta.mutate(undefined, {
              onSuccess: () => {
                setSelectedId(null);
                setMobileShowConversation(false);
                const next = new URLSearchParams(searchParams);
                next.delete('conversationId');
                setSearchParams(next, { replace: true });
                toast.success(mockActive ? 'Preview: disconnected' : 'Meta disconnected');
              },
              onError: (e) => toast.error(e.message),
            })
          }
          templates={templatesQuery.data ?? []}
          templatesLoading={templatesQuery.isLoading}
          templatesSaving={templatesQuery.save.isPending}
          onSaveTemplate={async (payload) => {
            await templatesQuery.save.mutateAsync(payload);
          }}
          onDeleteTemplate={async (id) => {
            await templatesQuery.remove.mutateAsync(id);
          }}
          automationSettings={automationQuery.data}
          automationLoading={automationQuery.isLoading}
          automationSaving={automationQuery.patch.isPending}
          onSaveAutomation={async (patch) => {
            await automationQuery.patch.mutateAsync(patch);
          }}
        />
        <MetaPagePickerDialog
          open={!!pagePickerState}
          pages={pagePicker.pagesQuery.data ?? []}
          loading={pagePicker.pagesQuery.isLoading}
          error={
            pagePicker.pagesQuery.isError ? (pagePicker.pagesQuery.error as Error).message : null
          }
          completing={pagePicker.complete.isPending}
          onConnect={(pageId) => {
            pagePicker.complete.mutate(pageId, {
              onSuccess: (data) => {
                toast.success(
                  data.pageName ? `Connected ${data.pageName}` : 'Meta channels connected'
                );
                setPagePickerState(null);
                setManageModal('channels');
              },
              onError: (e) => toast.error(e.message),
            });
          }}
          onOpenChange={(open) => {
            if (!open) setPagePickerState(null);
          }}
        />
      </div>
    </AdminMobilePage>
  );
}
