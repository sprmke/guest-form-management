import type { ReactNode } from 'react';

import { MarketingPublicSectionHeading } from '@/features/guest/marketing/shared/components/MarketingPublicSectionHeading';

export interface MarketingPublicFaqItem {
  question: string;
  answer: ReactNode;
}

interface MarketingPublicFaqListProps {
  title: string;
  items: MarketingPublicFaqItem[];
  className?: string;
}

export function MarketingPublicFaqList({ title, items, className }: MarketingPublicFaqListProps) {
  return (
    <section className={className}>
      <MarketingPublicSectionHeading title={title} />
      <dl className="mt-8 space-y-8">
        {items.map(({ question, answer }) => (
          <div key={question}>
            <dt className="text-foreground text-lg font-semibold">{question}</dt>
            <dd className="text-muted-foreground mt-2 leading-relaxed">{answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
