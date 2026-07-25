import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Loader2, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { useGuestAuth } from '@/features/guest/auth/context/GuestAuthContext';
import { takeContactHostDraft } from '@/features/guest/auth/lib/guestAuthResume';
import { GuestChatThread } from '@/features/guest/chat/components/GuestChatThread';
import {
  GUEST_CHAT_MESSAGES_KEY,
  GUEST_CHAT_RESUME_KEY,
  useGuestChatMessages,
  useGuestChatResume,
  useGuestChatStart,
} from '@/features/guest/chat/hooks/useGuestChat';
import { sendGuestChatMessage, startGuestWebChat } from '@/features/guest/chat/lib/guestChatApi';
import { BookingCalendarModal } from '@/features/guest/marketing/properties/components/property-detail/BookingCalendarModal';
import type { ListingHostInfo } from '@/features/guest/marketing/shared/components/ListingHostCard';
import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatDateToYYYYMMDD, formatIsoDateForDisplay } from '@/utils/format/dates';

export type ContactHostSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertySlug: string;
  propertyName: string;
  checkIn: Date | null;
  checkOut: Date | null;
  onDatesChange: (checkIn: Date | null, checkOut: Date | null) => void;
  host: ListingHostInfo;
  initialDraft?: string;
};

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ContactHostSheet({
  open,
  onOpenChange,
  propertySlug,
  propertyName,
  checkIn,
  checkOut,
  onDatesChange,
  host,
  initialDraft = '',
}: ContactHostSheetProps) {
  const queryClient = useQueryClient();
  const { status } = useGuestAuth();
  const [composeDraft, setComposeDraft] = useState(initialDraft);
  const [sendingFirst, setSendingFirst] = useState(false);
  const [localConversationId, setLocalConversationId] = useState<string | null>(null);
  const [datesModalOpen, setDatesModalOpen] = useState(false);
  const pendingAutoSendRef = useRef(false);

  const checkInDate = checkIn ? formatDateToYYYYMMDD(checkIn) : '';
  const checkOutDate = checkOut ? formatDateToYYYYMMDD(checkOut) : '';
  const hasDates = Boolean(checkInDate && checkOutDate);

  const resumeQuery = useGuestChatResume({
    propertySlug,
    enabled: open && status === 'authenticated',
  });

  const resumedConversationId =
    resumeQuery.data?.hasMessages && resumeQuery.data.conversationId
      ? resumeQuery.data.conversationId
      : null;
  const isReturningGuest = Boolean(resumedConversationId);
  const requiresDatesForSend = !isReturningGuest && !localConversationId;

  const resumeCheckInDate = resumeQuery.data?.inquiryCheckIn?.trim() ?? '';
  const resumeCheckOutDate = resumeQuery.data?.inquiryCheckOut?.trim() ?? '';

  const startQuery = useGuestChatStart({
    propertySlug,
    checkInDate,
    checkOutDate,
    enabled:
      open && status === 'authenticated' && hasDates && !isReturningGuest && !localConversationId,
  });

  const conversationId =
    localConversationId ?? resumedConversationId ?? startQuery.data?.conversationId ?? null;

  const {
    messages,
    isLoading: messagesLoading,
    send,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGuestChatMessages(conversationId);

  const hostLabel = host.ownerName.trim() || 'Host';
  const hostAvatar = host.ownerAvatarUrl || host.organizationLogoUrl || null;

  const displayCheckInDate = checkInDate || resumeCheckInDate;
  const displayCheckOutDate = checkOutDate || resumeCheckOutDate;
  const dateLabel =
    displayCheckInDate && displayCheckOutDate
      ? `${formatIsoDateForDisplay(displayCheckInDate)} – ${formatIsoDateForDisplay(displayCheckOutDate)}`
      : '';

  const showThread =
    Boolean(conversationId) &&
    (messages.length > 0 || isReturningGuest || Boolean(localConversationId));

  const sendFirstMessage = useCallback(
    async (text: string) => {
      setSendingFirst(true);
      try {
        let convId = conversationId;
        if (!convId) {
          if (!hasDates) return;
          const started = await startGuestWebChat({
            propertySlug,
            checkInDate,
            checkOutDate,
          });
          convId = started.conversationId;
          setLocalConversationId(convId);
        }

        await sendGuestChatMessage(convId, text);
        await queryClient.invalidateQueries({
          queryKey: [GUEST_CHAT_MESSAGES_KEY, convId],
        });
        await queryClient.invalidateQueries({
          queryKey: [GUEST_CHAT_RESUME_KEY, propertySlug],
        });
        setComposeDraft('');
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSendingFirst(false);
      }
    },
    [conversationId, hasDates, propertySlug, checkInDate, checkOutDate, queryClient]
  );

  useEffect(() => {
    if (!open || !resumeQuery.data?.hasMessages) return;
    const nextCheckIn = parseIsoDate(resumeQuery.data.inquiryCheckIn);
    const nextCheckOut = parseIsoDate(resumeQuery.data.inquiryCheckOut);
    if (nextCheckIn && nextCheckOut && !hasDates) {
      onDatesChange(nextCheckIn, nextCheckOut);
    }
  }, [open, resumeQuery.data, hasDates, onDatesChange]);

  useEffect(() => {
    if (open) {
      const restored = takeContactHostDraft();
      if (restored) {
        setComposeDraft(restored);
        pendingAutoSendRef.current = true;
      } else if (initialDraft) {
        setComposeDraft(initialDraft);
      }
      return;
    }

    setSendingFirst(false);
    setLocalConversationId(null);
    setDatesModalOpen(false);
    pendingAutoSendRef.current = false;
    if (!showThread) setComposeDraft('');
  }, [open, initialDraft, showThread]);

  useEffect(() => {
    if (!open || status !== 'authenticated' || !pendingAutoSendRef.current) return;
    const text = composeDraft.trim();
    if (!text || showThread || sendingFirst) return;
    if (requiresDatesForSend && !hasDates) return;
    if (resumeQuery.isLoading) return;

    pendingAutoSendRef.current = false;
    void sendFirstMessage(text);
  }, [
    open,
    status,
    composeDraft,
    hasDates,
    showThread,
    sendingFirst,
    sendFirstMessage,
    requiresDatesForSend,
    resumeQuery.isLoading,
  ]);

  const openDatesModal = useCallback(() => {
    setDatesModalOpen(true);
  }, []);

  const handleDatesSaved = useCallback(
    (nextCheckIn: Date | null, nextCheckOut: Date | null) => {
      onDatesChange(nextCheckIn, nextCheckOut);
      if (nextCheckIn && nextCheckOut) {
        setDatesModalOpen(false);
      }
    },
    [onDatesChange]
  );

  const handleSendFirst = useCallback(() => {
    const text = composeDraft.trim();
    if (!text || sendingFirst || send.isPending) return;

    if (requiresDatesForSend && !hasDates) {
      openDatesModal();
      return;
    }

    if (status !== 'authenticated') return;

    void sendFirstMessage(text);
  }, [
    composeDraft,
    sendingFirst,
    send.isPending,
    requiresDatesForSend,
    hasDates,
    status,
    openDatesModal,
    sendFirstMessage,
  ]);

  const canComposeWithoutDates = !requiresDatesForSend || hasDates;

  const loading =
    status === 'loading' ||
    (open && status === 'authenticated' && resumeQuery.isLoading && !localConversationId) ||
    (open &&
      status === 'authenticated' &&
      hasDates &&
      !isReturningGuest &&
      startQuery.isLoading &&
      !showThread &&
      !composeDraft);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[min(85dvh,560px)] max-h-[min(90dvh,560px)] w-full max-w-[min(calc(100vw-1.5rem),28rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-border shrink-0 space-y-0 border-b pb-5 pr-8 text-left">
            <div className="flex items-center gap-3">
              <div className="from-primary to-primary/80 ring-background relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br ring-2">
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
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-semibold">{hostLabel}</DialogTitle>
                <p className="text-muted-foreground truncate text-xs">
                  {dateLabel ? `${propertyName} · ${dateLabel}` : propertyName}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="bg-muted/20 flex min-h-0 flex-1 flex-col">
            {loading ? (
              <div className="flex flex-1 items-center justify-center p-4">
                <Skeleton className="h-24 w-full max-w-xs rounded-2xl" />
              </div>
            ) : showThread && conversationId ? (
              <GuestChatThread
                className="px-3 py-4 sm:px-4"
                messages={messages}
                isLoading={messagesLoading}
                sending={send.isPending}
                hasOlderMessages={!!hasNextPage}
                loadingOlder={isFetchingNextPage}
                onLoadOlder={() => void fetchNextPage()}
                onSend={async (text) => {
                  await send.mutateAsync(text);
                }}
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col justify-end">
                <div className="border-border bg-background shrink-0 border-t pt-4">
                  <div className="flex items-end gap-2">
                    {canComposeWithoutDates ? (
                      <>
                        <Textarea
                          value={composeDraft}
                          onChange={(e) => setComposeDraft(e.target.value)}
                          placeholder="Message"
                          rows={1}
                          className="max-h-32 min-h-[44px] flex-1 resize-none py-3 text-base"
                          aria-label="Message to host"
                          disabled={sendingFirst}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendFirst();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          className="min-h-[44px] min-w-[44px] shrink-0 rounded-full"
                          disabled={!composeDraft.trim() || sendingFirst}
                          onClick={handleSendFirst}
                          aria-label="Send message"
                        >
                          {sendingFirst ? (
                            <Loader2 className="size-5 animate-spin" aria-hidden />
                          ) : (
                            <SendHorizontal className="size-5" aria-hidden />
                          )}
                        </Button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={openDatesModal}
                        className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground flex min-h-[44px] w-full items-center gap-2 rounded-md border px-3 text-base transition-colors"
                        aria-label="Select dates"
                      >
                        <CalendarDays className="size-5 shrink-0" aria-hidden />
                        Select Dates
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BookingCalendarModal
        open={datesModalOpen}
        onOpenChange={setDatesModalOpen}
        propertySlug={propertySlug}
        propertyName={propertyName}
        checkIn={checkIn}
        checkOut={checkOut}
        onDatesChange={handleDatesSaved}
      />
    </>
  );
}
