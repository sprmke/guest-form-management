import { Link } from 'react-router-dom';

import { BookOpen, MessageSquarePlus, Sparkles, Ticket } from 'lucide-react';

import { openAiAssistant } from '@/features/dashboard/ai-assistant/lib/assistantOpenStore';
import { HelpCenterFaqAccordion } from '@/features/dashboard/help-support/components/HelpCenterFaqAccordion';
import {
  helpSupportNewTicketPath,
  helpSupportTicketsPath,
  useHelpSupportBasePath,
} from '@/features/dashboard/help-support/lib/helpSupportPaths';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { cn } from '@/lib/utils';

function QuickActionCard({
  title,
  description,
  Icon,
  onClick,
  href,
}: {
  title: string;
  description: string;
  Icon: typeof BookOpen;
  onClick?: () => void;
  href?: string;
}) {
  const className = cn(
    'border-border bg-card hover:border-primary/40 flex min-h-[88px] items-start gap-3 rounded-xl border p-4 text-left transition-colors'
  );
  const content = (
    <>
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4.5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{description}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link to={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function HelpSupportOverviewPage() {
  const basePath = useHelpSupportBasePath();

  return (
    <AdminMobilePage title="Help & Support" titleId="help-support-overview-heading">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuickActionCard
            title="Documentation"
            description="Guides for every page and feature"
            Icon={BookOpen}
            href={basePath ? `${basePath}/docs` : undefined}
          />
          <QuickActionCard
            title="Ask the AI Assistant"
            description="Get answers about your bookings and data"
            Icon={Sparkles}
            onClick={openAiAssistant}
          />
          <QuickActionCard
            title="My tickets"
            description="Track tickets you've submitted"
            Icon={Ticket}
            href={basePath ? helpSupportTicketsPath(basePath) : undefined}
          />
          <QuickActionCard
            title="Submit a ticket"
            description="Report a bug, suggest a feature, or ask us directly"
            Icon={MessageSquarePlus}
            href={basePath ? helpSupportNewTicketPath(basePath) : undefined}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-foreground text-sm font-semibold">Frequently asked questions</h2>
          <HelpCenterFaqAccordion />
        </div>
      </div>
    </AdminMobilePage>
  );
}
