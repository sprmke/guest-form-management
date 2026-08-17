import { useEffect, useRef, useState } from 'react';

import { ArrowLeft, Loader2, Paperclip, SendHorizontal, Ticket } from 'lucide-react';
import { toast } from 'sonner';

import { HelpEmptyState } from '@/features/dashboard/help-support/components/HelpEmptyState';
import { SupportTicketStatusBadge } from '@/features/dashboard/help-support/components/SupportTicketStatusBadge';
import { TicketAttachmentDropzone } from '@/features/dashboard/help-support/components/TicketAttachmentDropzone';
import {
  useReplySupportTicket,
  useSupportTicket,
} from '@/features/dashboard/help-support/hooks/useSupportTickets';
import type { SupportTicketMessage } from '@/features/dashboard/help-support/lib/supportTicketApi';
import {
  SUPPORT_TICKET_CATEGORY_LABELS,
  type SupportTicketAttachmentDraft,
} from '@/features/dashboard/help-support/lib/supportTicketSchema';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MessageBubble({ message }: { message: SupportTicketMessage }) {
  const isAdmin = message.sender_type === 'admin';
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', isAdmin ? 'items-start' : 'items-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] sm:max-w-[70%]',
          isAdmin ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
        )}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        {message.attachments.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {message.attachments.map((attachment) => {
              if (attachment.url && attachment.mimeType.startsWith('image/')) {
                return (
                  <a
                    key={attachment.path}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="aspect-square rounded-md object-cover"
                    />
                  </a>
                );
              }
              if (attachment.url && attachment.mimeType.startsWith('video/')) {
                return (
                  <video
                    key={attachment.path}
                    src={attachment.url}
                    controls
                    className="aspect-square rounded-md object-cover"
                  />
                );
              }
              return (
                <a
                  key={attachment.path}
                  href={attachment.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'flex min-h-[44px] items-center gap-1.5 rounded-md px-2 py-1.5 text-xs',
                    isAdmin ? 'bg-background/80' : 'bg-primary-foreground/15'
                  )}
                >
                  <Paperclip className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{attachment.name}</span>
                </a>
              );
            })}
          </div>
        ) : null}
      </div>
      <p className="text-muted-foreground px-1 text-[11px]">
        {message.sender_name}, {formatMessageTime(message.created_at)}
      </p>
    </div>
  );
}

export function TicketThreadPanel({ ticketId, onBack }: { ticketId: string; onBack?: () => void }) {
  const { data, isPending, isError, refetch } = useSupportTicket(ticketId);
  const replyMutation = useReplySupportTicket(ticketId);

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<SupportTicketAttachmentDraft[]>([]);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft('');
    setAttachments([]);
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [data?.messages.length, ticketId]);

  const canSend = draft.trim().length > 0 && !replyMutation.isPending && !attachmentsBusy;

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || replyMutation.isPending || attachmentsBusy) return;
    try {
      await replyMutation.mutateAsync({ message: trimmed, attachments });
      setDraft('');
      setAttachments([]);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not send reply'));
    }
  };

  if (isPending) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 p-4 sm:p-5">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-3/4" />
        <Skeleton className="ml-auto h-24 w-2/3" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-4">
        <HelpEmptyState
          icon={Ticket}
          title="Couldn't load this ticket"
          action={
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => void refetch()}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const { ticket, messages } = data;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="border-border/80 flex shrink-0 items-start gap-3 border-b px-3 py-3 sm:px-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] lg:hidden"
            onClick={onBack}
            aria-label="Back to list"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold [overflow-wrap:anywhere]">
            {ticket.subject}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {SUPPORT_TICKET_CATEGORY_LABELS[ticket.category]}
          </p>
        </div>
        <SupportTicketStatusBadge status={ticket.status} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-border/80 bg-muted/20 shrink-0 border-t p-3 sm:p-4">
        <TicketAttachmentDropzone
          variant="composer"
          value={attachments}
          onChange={setAttachments}
          disabled={replyMutation.isPending}
          onBusyChange={setAttachmentsBusy}
        >
          {({ trigger, chips, busy }) => (
            <div
              className={cn(
                'border-border/80 bg-background overflow-hidden rounded-xl border shadow-sm',
                'focus-within:border-primary/40 focus-within:ring-primary/10 focus-within:ring-2'
              )}
            >
              {chips ? <div className="border-border/60 border-b px-3 py-2.5">{chips}</div> : null}
              <Textarea
                id="ticket-reply"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a reply"
                rows={2}
                maxLength={5000}
                disabled={replyMutation.isPending}
                aria-label="Reply"
                className="min-h-[72px] resize-none border-0 bg-transparent px-3.5 py-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (canSend) void handleSend();
                  }
                }}
              />
              <div className="border-border/60 flex items-center justify-between gap-2 border-t px-2 py-1.5">
                {trigger}
                <Button
                  type="button"
                  size="sm"
                  className="h-9 min-h-[36px] min-w-[44px] gap-1.5 rounded-lg px-3"
                  disabled={!canSend || busy}
                  aria-label="Send reply"
                  onClick={() => void handleSend()}
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      Send
                      <SendHorizontal className="size-4" aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </TicketAttachmentDropzone>
      </div>
    </div>
  );
}
