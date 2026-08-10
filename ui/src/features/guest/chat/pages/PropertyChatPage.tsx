import { useEffect, useMemo, useState } from 'react';

import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';

import { ChevronLeft } from 'lucide-react';

import { useGuestAuth } from '@/features/guest/auth/context/GuestAuthContext';
import {
  GuestChatHeaderBar,
  GuestChatSearchPanelRow,
} from '@/features/guest/chat/components/GuestChatHeaderBar';
import { GuestChatThread } from '@/features/guest/chat/components/GuestChatThread';
import { VoiceSessionOverlay } from '@/features/guest/chat/components/voice/VoiceSessionOverlay';
import { useGuestChatMessages, useGuestChatStart } from '@/features/guest/chat/hooks/useGuestChat';
import {
  guestPropertyPath,
  guestPropertyPickDatesPath,
} from '@/features/guest/lib/guestPublicPaths';
import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';
import { GuestStayContextBar } from '@/features/guest/property/components/GuestStayContextBar';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatThreadSearch } from '@/lib/chat/useChatThreadSearch';
import { parseGuestInquiryDateRange } from '@/utils/format/dates';

function parseInquiryDates(searchParams: URLSearchParams): {
  checkInDate: string;
  checkOutDate: string;
} | null {
  const checkInDate = searchParams.get('checkInDate')?.trim() ?? '';
  const checkOutDate = searchParams.get('checkOutDate')?.trim() ?? '';
  const range = parseGuestInquiryDateRange(checkInDate, checkOutDate);
  if (!range) return null;
  return { checkInDate, checkOutDate };
}

export function PropertyChatPage() {
  const { propertySlug = '' } = useParams<{ propertySlug: string }>();
  const [searchParams] = useSearchParams();
  const { status, requireGuestAuth } = useGuestAuth();

  const dates = useMemo(() => parseInquiryDates(searchParams), [searchParams]);
  const propertyPath = guestPropertyPath(propertySlug);

  useEffect(() => {
    if (status !== 'anonymous' || !dates) return;
    requireGuestAuth(() => undefined, {
      resume: {
        type: 'navigate',
        to: `${propertyPath}/messages?${searchParams.toString()}`,
      },
    });
  }, [status, dates, requireGuestAuth, propertyPath, searchParams]);

  if (!dates) {
    return <Navigate to={guestPropertyPickDatesPath(propertySlug, 'contactHost')} replace />;
  }

  if (status === 'loading' || status === 'anonymous') {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-4 h-[60vh] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <PropertyChatContent
      propertySlug={propertySlug}
      checkInDate={dates.checkInDate}
      checkOutDate={dates.checkOutDate}
      propertyPath={propertyPath}
    />
  );
}

function PropertyChatContent({
  propertySlug,
  checkInDate,
  checkOutDate,
  propertyPath,
}: {
  propertySlug: string;
  checkInDate: string;
  checkOutDate: string;
  propertyPath: string;
}) {
  const startQuery = useGuestChatStart({
    propertySlug,
    checkInDate,
    checkOutDate,
    enabled: true,
  });
  const [voiceSessionOpen, setVoiceSessionOpen] = useState(false);

  const conversationId = startQuery.data?.conversationId ?? null;
  const {
    messages,
    isLoading,
    replyStatus,
    send,
    edit,
    unsend,
    uploadAttachment,
    retryFailedMessage,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGuestChatMessages(conversationId);

  const threadSearch = useChatThreadSearch(messages);

  if (startQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Link
          to={propertyPath}
          className="text-muted-foreground inline-flex min-h-[44px] items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back
        </Link>
        <p className="text-destructive text-sm">{(startQuery.error as Error).message}</p>
      </div>
    );
  }

  const host = startQuery.data?.host;
  const propertyName = startQuery.data?.property.name ?? 'Property';
  const hostLabel = host?.ownerName?.trim() || 'Host';
  const hostAvatar = host?.ownerAvatarUrl ?? null;

  const hostAvatarNode = (
    <div className="from-primary to-primary/80 relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br">
      {hostAvatar ? (
        <Image
          src={hostAvatar}
          alt={hostLabel}
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
          {hostLabel.charAt(0)}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col sm:h-[calc(100dvh-9rem)]">
      <div className="border-border shrink-0 border-b">
        <div className="px-2.5 py-2.5 sm:px-3">
          {startQuery.isLoading ? (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] shrink-0"
                asChild
              >
                <Link to={propertyPath} aria-label="Back to property">
                  <ChevronLeft className="size-5" />
                </Link>
              </Button>
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <GuestChatHeaderBar
              leading={
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] shrink-0"
                  asChild
                >
                  <Link to={propertyPath} aria-label="Back to property">
                    <ChevronLeft className="size-5" />
                  </Link>
                </Button>
              }
              avatar={hostAvatarNode}
              title={hostLabel}
              subtitle={propertyName}
              replyStatus={replyStatus}
              threadSearch={threadSearch}
              searchEnabled={!!conversationId && !isLoading && messages.length > 0}
              onStartVoiceSession={
                startQuery.data?.voiceReceptionistEnabled
                  ? () => setVoiceSessionOpen(true)
                  : undefined
              }
            />
          )}
        </div>
        {!startQuery.isLoading ? <GuestChatSearchPanelRow threadSearch={threadSearch} /> : null}
        {!startQuery.isLoading ? (
          <div className="border-border border-t px-3 py-2.5 sm:px-4">
            <GuestStayContextBar checkInDate={checkInDate} checkOutDate={checkOutDate} />
          </div>
        ) : null}
      </div>

      {voiceSessionOpen ? (
        <VoiceSessionOverlay
          propertySlug={propertySlug}
          onClose={() => setVoiceSessionOpen(false)}
        />
      ) : null}

      {startQuery.isLoading || !conversationId ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <Skeleton className="h-[50vh] w-full rounded-2xl" />
        </div>
      ) : (
        <GuestChatThread
          conversationId={conversationId}
          messages={messages}
          isLoading={isLoading}
          threadSearch={threadSearch}
          searchInHeader
          sending={send.isPending}
          editing={edit.isPending}
          hasOlderMessages={!!hasNextPage}
          loadingOlder={isFetchingNextPage}
          onLoadOlder={() => void fetchNextPage()}
          onRetryFailed={retryFailedMessage}
          onSend={async (text, opts) => {
            await send.mutateAsync({
              text,
              replyToMessageId: opts?.replyToMessageId,
              attachments: opts?.attachments,
            });
          }}
          onUploadAttachment={(file) => uploadAttachment.mutateAsync(file)}
          uploadingAttachment={uploadAttachment.isPending}
          onEdit={async (messageId, text) => {
            await edit.mutateAsync({ messageId, text });
          }}
          onUnsend={async (messageId) => {
            await unsend.mutateAsync(messageId);
          }}
          unsending={unsend.isPending}
        />
      )}
    </div>
  );
}
