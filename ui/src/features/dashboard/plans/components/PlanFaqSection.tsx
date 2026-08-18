import { ChevronDown, HelpCircle } from 'lucide-react';

import { PLAN_FAQ_ITEMS } from '@/features/dashboard/plans/lib/planPresentation';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type PlanFaqSectionProps = {
  className?: string;
};

export function PlanFaqSection({ className }: PlanFaqSectionProps) {
  return (
    <FloatingPanel
      as="section"
      padding="lg"
      aria-labelledby="plan-faq-heading"
      className={className}
    >
      <h2
        id="plan-faq-heading"
        className="text-foreground flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
      >
        <HelpCircle
          className="text-muted-foreground size-5 shrink-0"
          strokeWidth={1.75}
          aria-hidden
        />
        Frequently Asked Questions
      </h2>

      <div className="mt-4 space-y-3 sm:mt-5">
        {PLAN_FAQ_ITEMS.map((faq) => (
          <Collapsible key={faq.question}>
            <CollapsibleTrigger
              className={cn(
                'border-border hover:bg-muted/40 group flex min-h-11 w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2'
              )}
            >
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{faq.question}</span>
              <ChevronDown
                className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="text-muted-foreground px-4 pb-1 pt-2 text-sm leading-relaxed [overflow-wrap:anywhere]">
              {faq.answer}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </FloatingPanel>
  );
}
