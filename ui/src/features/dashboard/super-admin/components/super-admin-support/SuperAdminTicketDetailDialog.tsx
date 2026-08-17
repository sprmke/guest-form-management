import { useState } from 'react';

import { Loader2, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { SupportTicketStatusBadge } from '@/features/dashboard/help-support/components/SupportTicketStatusBadge';
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
    <div className={cn('flex flex-col gap-1', isAdmin ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
          isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
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
  const { data, isPending } = useSupportTicketAdmin(ticketId);
  const replyMutation = useReplySupportTicketAdmin(ticketId ?? '');
  const statusMutation = useUpdateSupportTicketStatus(ticketId ?? '');
  const [draft, setDraft] = useState('');

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      await replyMutation.mutateAsync(trimmed);
      setDraft('');
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not send reply'));
    }
  };

  return (
    <ResponsiveModal open={Boolean(ticketId)} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className={superAdminApprovalDialogContentClass} sheetLayout="split">
        <ResponsiveModalHeader className={superAdminApprovalDialogHeaderClass}>
          <ResponsiveModalTitle>{data?.ticket.subject ?? 'Ticket'}</ResponsiveModalTitle>
          {data ? (
            <p className="text-muted-foreground text-xs">
              {data.ticket.organizationName} · {SUPPORT_TICKET_CATEGORY_LABELS[data.ticket.category]}
            </p>
          ) : null}
        </ResponsiveModalHeader>

        <div className={cn(superAdminApprovalDialogBodyClass, 'flex-1 space-y-4')}>
          {isPending || !data ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={data.ticket.status}
                  onValueChange={(value) => statusMutation.mutate({ status: value })}
                >
                  <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={data.ticket.priority ?? 'none'}
                  onValueChange={(value) =>
                    statusMutation.mutate({ priority: value === 'none' ? null : value })
                  }
                >
                  <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Priority">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No priority</SelectItem>
                    {PRIORITY_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value} className="capitalize">
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <SupportTicketStatusBadge status={data.ticket.status} />
              </div>

              <div className="space-y-4">
                {data.messages.map((message) => (
                  <AdminMessageBubble key={message.id} message={message} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className={superAdminApprovalDialogFooterClass}>
          <div className="flex w-full flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Reply to the host…"
              rows={2}
              maxLength={5000}
            />
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={!draft.trim() || replyMutation.isPending}
              className="min-h-[44px] w-full sm:w-auto sm:self-end"
            >
              {replyMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <SendHorizontal className="size-4" aria-hidden />
              )}
              Send reply
            </Button>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
