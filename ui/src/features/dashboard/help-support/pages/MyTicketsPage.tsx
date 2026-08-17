import { Link } from 'react-router-dom';

import { Plus } from 'lucide-react';

import { SupportTicketStatusBadge } from '@/features/dashboard/help-support/components/SupportTicketStatusBadge';
import { useSupportTickets } from '@/features/dashboard/help-support/hooks/useSupportTickets';
import {
  helpSupportNewTicketPath,
  helpSupportTicketDetailPath,
  useHelpSupportBasePath,
} from '@/features/dashboard/help-support/lib/helpSupportPaths';
import { SUPPORT_TICKET_CATEGORY_LABELS } from '@/features/dashboard/help-support/lib/supportTicketSchema';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/lib/pageTitle';

function formatTicketDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MyTicketsPage() {
  usePageTitle('My tickets');
  const basePath = useHelpSupportBasePath();
  const { data, isPending, isError } = useSupportTickets();
  const tickets = data?.tickets ?? [];

  return (
    <AdminMobilePage
      title="My tickets"
      titleId="my-tickets-heading"
      desktopActions={
        basePath ? (
          <Button asChild size="sm">
            <Link to={helpSupportNewTicketPath(basePath)}>
              <Plus className="size-4" aria-hidden />
              New ticket
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        {!basePath ? null : (
          <Button asChild size="sm" className="min-h-[44px] w-full sm:hidden">
            <Link to={helpSupportNewTicketPath(basePath)}>
              <Plus className="size-4" aria-hidden />
              New ticket
            </Link>
          </Button>
        )}

        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <p className="text-muted-foreground text-sm">Couldn&apos;t load your tickets. Try again shortly.</p>
        ) : tickets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You haven&apos;t filed any support tickets yet.
          </p>
        ) : (
          <div className="divide-border border-border divide-y rounded-xl border">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={basePath ? helpSupportTicketDetailPath(basePath, ticket.id) : '#'}
                className="hover:bg-muted/40 flex min-h-[44px] items-center justify-between gap-3 px-4 py-3 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-medium">{ticket.subject}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {SUPPORT_TICKET_CATEGORY_LABELS[ticket.category]} ·{' '}
                    {formatTicketDate(ticket.created_at)}
                  </p>
                </div>
                <SupportTicketStatusBadge status={ticket.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminMobilePage>
  );
}
