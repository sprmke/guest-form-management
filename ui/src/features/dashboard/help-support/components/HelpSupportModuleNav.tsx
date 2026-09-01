import type { ReactNode } from 'react';
import { Children } from 'react';

import { useLocation } from 'react-router-dom';

import { BookOpen, HelpCircle, Sparkles, Ticket } from 'lucide-react';

import { openAiAssistant } from '@/features/dashboard/ai-assistant/lib/assistantOpenStore';
import {
  helpSupportDocsPath,
  helpSupportSectionFromPath,
  helpSupportTicketsPath,
  useHelpSupportBasePath,
} from '@/features/dashboard/help-support/lib/helpSupportPaths';

import { StatCard } from '@/components/shared/StatCard';
import { cn } from '@/lib/utils';

const VALUE_CLASS =
  'text-foreground line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug sm:min-h-[2.75rem] sm:text-base';
const CARD_CLASS = 'h-full';

/** Four-up nav: 4 columns on xl; 2×2 centered rows below. */
function HelpSupportModuleNavGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'native-stagger flex flex-wrap justify-center gap-3 xl:gap-4',
        '[&>*]:min-w-[9.25rem] [&>*]:max-w-[calc((100%-0.75rem)/2)] [&>*]:flex-[1_1_calc((100%-0.75rem)/2)]',
        'xl:[&>*]:min-w-0 xl:[&>*]:max-w-[calc((100%-3rem)/4)] xl:[&>*]:flex-[1_1_calc((100%-3rem)/4)]',
        '[&>*]:h-full'
      )}
    >
      {Children.toArray(children)}
    </div>
  );
}

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
      <HelpSupportModuleNavGrid>
        <StatCard
          title="FAQs"
          value="Common Q&As"
          valueClassName={VALUE_CLASS}
          className={CARD_CLASS}
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
          className={CARD_CLASS}
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
          className={CARD_CLASS}
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
          className={CARD_CLASS}
          icon={Sparkles}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
          onClick={openAiAssistant}
        />
      </HelpSupportModuleNavGrid>
    </nav>
  );
}
