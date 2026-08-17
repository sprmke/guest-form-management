import { useLocation } from 'react-router-dom';

import { BookOpen, HelpCircle, Sparkles, Ticket } from 'lucide-react';

import { openAiAssistant } from '@/features/dashboard/ai-assistant/lib/assistantOpenStore';
import {
  helpSupportDocsPath,
  helpSupportSectionFromPath,
  helpSupportTicketsPath,
  useHelpSupportBasePath,
} from '@/features/dashboard/help-support/lib/helpSupportPaths';

import { StatCard, StatCardGrid } from '@/components/shared/StatCard';

const VALUE_CLASS = 'text-foreground whitespace-normal text-sm font-semibold sm:text-base';

export function HelpSupportModuleNav() {
  const location = useLocation();
  const basePath = useHelpSupportBasePath();
  const section = helpSupportSectionFromPath(location.pathname);
  const faqsSelected = section === 'faqs';
  const guidesSelected = section === 'guides';
  const ticketsSelected = section === 'tickets';
  const ticketsAtRoot = /\/help-support\/tickets\/?$/.test(location.pathname);

  if (!basePath) return null;

  return (
    <nav aria-label="Help and support">
      <StatCardGrid>
        <StatCard
          title="FAQs"
          value="Common Q&As"
          valueClassName={VALUE_CLASS}
          icon={HelpCircle}
          iconClassName="text-violet-600 dark:text-violet-400"
          iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
          to={basePath}
          active={faqsSelected}
        />
        <StatCard
          title="Guides"
          value="How each page works"
          valueClassName={VALUE_CLASS}
          icon={BookOpen}
          iconClassName="text-blue-600 dark:text-blue-400"
          iconBgClassName="bg-blue-100 dark:bg-blue-900/30"
          to={guidesSelected ? basePath : helpSupportDocsPath(basePath)}
          active={guidesSelected}
        />
        <StatCard
          title="Tickets"
          value="Write to our team"
          valueClassName={VALUE_CLASS}
          icon={Ticket}
          iconClassName="text-amber-600 dark:text-amber-400"
          iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
          to={ticketsSelected && ticketsAtRoot ? basePath : helpSupportTicketsPath(basePath)}
          active={ticketsSelected}
        />
        <StatCard
          title="Ask AI"
          value="Answers from your data"
          valueClassName={VALUE_CLASS}
          icon={Sparkles}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
          onClick={openAiAssistant}
        />
      </StatCardGrid>
    </nav>
  );
}
