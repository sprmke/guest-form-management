import { useEffect, useMemo, useState } from 'react';

import { ArrowLeft } from 'lucide-react';

import { GuestMessageThreadRow } from '@/features/guest/account/components/GuestMessageThreadRow';
import type { GuestMessageThreadDto } from '@/features/guest/account/lib/guestAccountApi';
import { GuestChatThread } from '@/features/guest/chat/components/GuestChatThread';
import { useGuestChatMessages } from '@/features/guest/chat/hooks/useGuestChat';
import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIsoDateForDisplay } from '@/utils/format/dates';

type Props = {
  threads: GuestMessageThreadDto[];
};

/** Bounded height so thread list + message pane can scroll independently. */
export const GUEST_MESSAGES_HUB_SHELL_CLASS =
  'border-border bg-card flex h-[calc(100dvh-12rem)] max-h-[720px] min-h-[480px] flex-col overflow-hidden rounded-2xl border shadow-sm lg:h-[calc(100dvh-10rem)]';

export function GuestMessagesHub({ threads }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowConversation, setMobileShowConversation] = useState(false);

  useEffect(() => {
    if (threads.length === 0) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    if (mq.matches && !selectedId) {
      setSelectedId(threads[0]?.conversationId ?? null);
    }
  }, [threads, selectedId]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.conversationId === selectedId) ?? null,
    [threads, selectedId]
  );

  const {
    messages,
    isLoading: messagesLoading,
    send,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGuestChatMessages(selectedId);

  const handleSelect = (conversationId: string) => {
    setSelectedId(conversationId);
    setMobileShowConversation(true);
  };

  const thumb =
    selectedThread?.propertyImageUrl?.trim() || selectedThread?.hostAvatarUrl?.trim() || null;

  return (
    <div className={GUEST_MESSAGES_HUB_SHELL_CLASS}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            'border-border flex h-full min-h-0 w-full shrink-0 flex-col border-r lg:w-[min(100%,320px)]',
            mobileShowConversation ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {threads.map((thread) => (
              <GuestMessageThreadRow
                key={thread.conversationId}
                thread={thread}
                selected={thread.conversationId === selectedId}
                onSelect={() => handleSelect(thread.conversationId)}
              />
            ))}
          </div>
        </div>

        <div
          className={cn(
            'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
            mobileShowConversation ? 'flex' : 'hidden lg:flex'
          )}
        >
          {selectedThread ? (
            <>
              <div className="border-border flex shrink-0 items-center gap-3 border-b px-3 py-3 sm:px-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] shrink-0 lg:hidden"
                  onClick={() => setMobileShowConversation(false)}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="size-5" aria-hidden />
                </Button>
                <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-lg">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      width={40}
                      height={40}
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground line-clamp-1 text-sm font-semibold">
                    {selectedThread.propertyName ?? 'Property'}
                  </p>
                  {selectedThread.hostName ? (
                    <p className="text-muted-foreground truncate text-xs">
                      {selectedThread.hostName}
                    </p>
                  ) : null}
                  {selectedThread.inquiryCheckIn && selectedThread.inquiryCheckOut ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatIsoDateForDisplay(selectedThread.inquiryCheckIn)} →{' '}
                      {formatIsoDateForDisplay(selectedThread.inquiryCheckOut)}
                    </p>
                  ) : null}
                </div>
              </div>

              <GuestChatThread
                className="px-3 py-4 sm:px-4"
                messages={messages}
                isLoading={messagesLoading && !!selectedId}
                onSend={async (text) => {
                  await send.mutateAsync(text);
                }}
                sending={send.isPending}
                hasOlderMessages={!!hasNextPage}
                loadingOlder={isFetchingNextPage}
                onLoadOlder={() => void fetchNextPage()}
              />
            </>
          ) : (
            <div className="text-muted-foreground flex flex-1 items-center justify-center px-6 text-sm">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
