import { AdminTableRowAffordance } from '@/features/dashboard/bookings/components/AdminDataTable';
import { SupportTicketStatusBadge } from '@/features/dashboard/help-support/components/SupportTicketStatusBadge';
import { SUPPORT_TICKET_CATEGORY_LABELS } from '@/features/dashboard/help-support/lib/supportTicketSchema';
import type { AdminSupportTicket } from '@/features/dashboard/super-admin/hooks/useSupportTicketsAdmin';
import {
  SUPPORT_TICKET_PRIORITY_LABELS,
  formatSupportTicketDate,
} from '@/features/dashboard/super-admin/lib/superAdminSupportFilters';

import { AdminCardGrid, AdminCardRow } from '@/components/mobile/AdminCardGrid';

type Props = {
  tickets: AdminSupportTicket[];
  onSelect: (ticketId: string) => void;
};

export function SuperAdminSupportCardGrid({ tickets, onSelect }: Props) {
  return (
    <AdminCardGrid denser={false}>
      {tickets.map((ticket) => (
        <AdminCardRow
          key={ticket.id}
          onOpen={() => onSelect(ticket.id)}
          aria-label={`Open ${ticket.subject}`}
          className="min-h-[132px] gap-3 p-3.5 sm:p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-semibold">{ticket.subject}</p>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {ticket.organizationName}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {ticket.submitted_by_name || ticket.submitted_by_email}
              </p>
            </div>
            <AdminTableRowAffordance />
          </div>

          <div className="border-border/50 mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <span className="text-muted-foreground text-xs">
              {SUPPORT_TICKET_CATEGORY_LABELS[ticket.category]}
              {ticket.priority ? ` · ${SUPPORT_TICKET_PRIORITY_LABELS[ticket.priority]}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatSupportTicketDate(ticket.created_at)}
              </span>
              <SupportTicketStatusBadge status={ticket.status} />
            </div>
          </div>
        </AdminCardRow>
      ))}
    </AdminCardGrid>
  );
}
