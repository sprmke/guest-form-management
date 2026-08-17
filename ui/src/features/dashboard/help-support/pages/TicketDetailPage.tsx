import { useState } from 'react';

import { useParams } from 'react-router-dom';

import { Loader2, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

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

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { usePageTitle } from '@/lib/pageTitle';
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
    <div className={cn('flex flex-col gap-1', isAdmin ? 'items-start' : 'items-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[70%]',
          isAdmin ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
        )}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        {message.attachments.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {message.attachments.map((attachment) =>
              attachment.url && attachment.mimeType.startsWith('image/') ? (
                <img
                  key={attachment.path}
                  src={attachment.url}
                  alt={attachment.name}
                  className="aspect-square rounded-md object-cover"
                />
              ) : attachment.url && attachment.mimeType.startsWith('video/') ? (
                <video
                  key={attachment.path}
                  src={attachment.url}
                  controls
                  className="aspect-square rounded-md object-cover"
                />
              ) : null
            )}
          </div>
        ) : null}
      </div>
      <p className="text-muted-foreground px-1 text-[11px]">
        {message.sender_name} · {formatMessageTime(message.created_at)}
      </p>
    </div>
  );
}

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  usePageTitle('Ticket');
  const { data, isPending, isError } = useSupportTicket(ticketId ?? null);
  const replyMutation = useReplySupportTicket(ticketId ?? '');

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<SupportTicketAttachmentDraft[]>([]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
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
      <AdminMobilePage title="Ticket" titleId="ticket-detail-heading">
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AdminMobilePage>
    );
  }

  if (isError || !data) {
    return (
      <AdminMobilePage title="Ticket" titleId="ticket-detail-heading">
        <p className="text-muted-foreground text-sm">Couldn&apos;t load this ticket.</p>
      </AdminMobilePage>
    );
  }

  const { ticket, messages } = data;

  return (
    <AdminMobilePage title={ticket.subject} titleId="ticket-detail-heading">
      <div className="flex max-w-2xl flex-col gap-6">
        <div className="border-border/80 bg-muted/15 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3">
          <div>
            <p className="text-foreground text-sm font-semibold">{ticket.subject}</p>
            <p className="text-muted-foreground text-xs">
              {SUPPORT_TICKET_CATEGORY_LABELS[ticket.category]}
            </p>
          </div>
          <SupportTicketStatusBadge status={ticket.status} />
        </div>

        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>

        <div className="space-y-2.5 border-t pt-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a reply…"
            rows={3}
            maxLength={5000}
          />
          <TicketAttachmentDropzone value={attachments} onChange={setAttachments} />
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || replyMutation.isPending}
            className="min-h-[44px]"
          >
            {replyMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="size-4" aria-hidden />
            )}
            Send
          </Button>
        </div>
      </div>
    </AdminMobilePage>
  );
}
