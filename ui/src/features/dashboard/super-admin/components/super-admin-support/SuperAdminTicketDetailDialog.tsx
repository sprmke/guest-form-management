import { useEffect, useRef, useState } from 'react';

import { Loader2, Paperclip, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import type { SupportTicketMessage } from '@/features/dashboard/help-support/lib/supportTicketApi';
import { SUPPORT_TICKET_CATEGORY_LABELS } from '@/features/dashboard/help-support/lib/supportTicketSchema';
import {
  superAdminApprovalDialogBodyClass,
  superAdminApprovalDialogContentClass,
  superAdminApprovalDialogFooterClass,
  superAdminApprovalDialogHeaderClass,
} from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalDialogLayout';
import {
  useReplySupportTicketAdmin,
  useSupportTicketAdmin,
  useUpdateSupportTicketStatus,
} from '@/features/dashboard/super-admin/hooks/useSupportTicketsAdmin';
import {
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
} from '@/features/dashboard/super-admin/lib/superAdminSupportFilters';

import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function AdminMessageBubble({ message }: { message: SupportTicketMessage }) {
  const isAdmin = message.sender_type === 'admin';
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', isAdmin ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere]',
          isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
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
                    isAdmin ? 'bg-primary-foreground/15' : 'bg-background/80'
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
        {message.sender_name} · {formatMessageTime(message.created_at)}
      </p>
    </div>
  );
}

export function SuperAdminTicketDetailDialog({
  ticketId,
  onOpenChange,
}: {
  ticketId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isPending, isError, refetch } = useSupportTicketAdmin(ticketId);
  const replyMutation = useReplySupportTicketAdmin(ticketId ?? '');
  const statusMutation = useUpdateSupportTicketStatus(ticketId ?? '');
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft('');
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [data?.messages.length, ticketId]);

  const canSend = draft.trim().length > 0 && !replyMutation.isPending && Boolean(data);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || replyMutation.isPending) return;
    try {
      await replyMutation.mutateAsync(trimmed);
      setDraft('');
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not send reply'));
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await statusMutation.mutateAsync({ status });
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not update status'));
    }
  };

  const handlePriorityChange = async (value: string) => {
    try {
      await statusMutation.mutateAsync({ priority: value === 'none' ? null : value });
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not update priority'));
    }
  };

  return (
    <ResponsiveModal open={Boolean(ticketId)} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className={superAdminApprovalDialogContentClass} sheetLayout="split">
        <ResponsiveModalHeader className={superAdminApprovalDialogHeaderClass}>
          <ResponsiveModalTitle className="pr-8 [overflow-wrap:anywhere]">
            {data?.ticket.subject ?? 'Ticket'}
          </ResponsiveModalTitle>
          {data ? (
            <div className="space-y-3">
              <p className="text-muted-foreground min-w-0 truncate text-xs">
                {data.ticket.organizationName} ·{' '}
                {SUPPORT_TICKET_CATEGORY_LABELS[data.ticket.category]}
              </p>
              <p className="text-muted-foreground min-w-0 truncate text-xs">
                {data.ticket.submitted_by_name}
                {data.ticket.submitted_by_email ? ` · ${data.ticket.submitted_by_email}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={data.ticket.status}
                  onValueChange={(value) => void handleStatusChange(value)}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {SUPPORT_TICKET_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={data.ticket.priority ?? 'none'}
                  onValueChange={(value) => void handlePriorityChange(value)}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Priority">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No priority</SelectItem>
                    {PRIORITY_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {SUPPORT_TICKET_PRIORITY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </ResponsiveModalHeader>

        <div className={cn(superAdminApprovalDialogBodyClass, 'flex min-h-0 flex-1 flex-col')}>
          {isPending || (!data && !isError) ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          ) : isError || !data ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-destructive text-sm">Could not load this ticket.</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              {data.messages.map((message) => (
                <AdminMessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {data ? (
          <div className={cn(superAdminApprovalDialogFooterClass, 'sm:flex-col')}>
            <div
              className={cn(
                'border-border/80 bg-background w-full overflow-hidden rounded-xl border shadow-sm',
                'focus-within:border-primary/40 focus-within:ring-primary/10 focus-within:ring-2'
              )}
            >
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Reply to the host…"
                rows={2}
                maxLength={5000}
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
              <div className="border-border/60 flex items-center justify-end border-t px-2 py-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-9 min-h-[36px] gap-1.5 rounded-lg px-3"
                  disabled={!canSend}
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
          </div>
        ) : null}
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
