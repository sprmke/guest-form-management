import { useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { LifeBuoy, ListChecks, Loader2, Search } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SupportTicketStatusBadge } from '@/features/dashboard/help-support/components/SupportTicketStatusBadge';
import { SUPPORT_TICKET_CATEGORY_LABELS } from '@/features/dashboard/help-support/lib/supportTicketSchema';
import { SuperAdminTicketDetailDialog } from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminTicketDetailDialog';
import {
  useSupportTicketsAdmin,
  type AdminSupportTicket,
} from '@/features/dashboard/super-admin/hooks/useSupportTicketsAdmin';
import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsBelowLg } from '@/hooks/useMediaQuery';

function formatTicketDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TicketRow({ ticket, onSelect }: { ticket: AdminSupportTicket; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="border-border bg-card hover:border-primary/40 flex min-h-[44px] w-full flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-foreground truncate text-sm font-medium">{ticket.subject}</p>
        <SupportTicketStatusBadge status={ticket.status} />
      </div>
      <p className="text-muted-foreground text-xs">
        {ticket.organizationName} · {SUPPORT_TICKET_CATEGORY_LABELS[ticket.category]} ·{' '}
        {formatTicketDate(ticket.created_at)}
      </p>
    </button>
  );
}

export function SuperAdminSupportPage() {
  const { data, isLoading, error } = useSupportTicketsAdmin({
    category: null,
    status: null,
    orgId: null,
  });
  const isMobileLayout = useIsBelowLg();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const tickets = data?.tickets ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (category !== 'all' && ticket.category !== category) return false;
      if (status !== 'all' && ticket.status !== status) return false;
      if (
        term &&
        !ticket.subject.toLowerCase().includes(term) &&
        !ticket.organizationName.toLowerCase().includes(term) &&
        !ticket.submitted_by_email.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [tickets, search, category, status]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        title="Support tickets"
        subtitle="Host bug reports, suggestions, and inquiries."
        actions={
          <Button asChild variant="outline" size="sm" className="min-h-[44px]">
            <Link to={superAdminPaths.supportFaqs}>
              <ListChecks className="size-4" aria-hidden />
              Manage FAQs
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tickets…"
            className="h-10 pl-9"
            aria-label="Search tickets"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 w-[10.5rem] shrink-0" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(SUPPORT_TICKET_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 w-[9.5rem] shrink-0" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">Could not load support tickets.</p>
      ) : filtered.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
          <LifeBuoy className="text-muted-foreground size-10" aria-hidden />
          <p className="text-foreground text-sm font-medium">No tickets match your filters</p>
        </div>
      ) : isMobileLayout ? (
        <div className="space-y-2">
          {filtered.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onSelect={() => setSelectedTicketId(ticket.id)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {filtered.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onSelect={() => setSelectedTicketId(ticket.id)} />
          ))}
        </div>
      )}

      <SuperAdminTicketDetailDialog
        ticketId={selectedTicketId}
        onOpenChange={(open) => {
          if (!open) setSelectedTicketId(null);
        }}
      />
    </div>
  );
}
