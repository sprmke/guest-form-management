import type { ReactNode } from 'react';

import { MarketingPublicPageContent } from '@/features/guest/marketing/shared/components/MarketingPublicPageContent';
import { MarketingPublicPageHero } from '@/features/guest/marketing/shared/components/MarketingPublicPageHero';

interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalSimplePageProps {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  sections: LegalSection[];
  blobPosition?: 'left' | 'right';
}

export function LegalSimplePage({
  eyebrow = 'Legal',
  title,
  description,
  sections,
  blobPosition = 'left',
}: LegalSimplePageProps) {
  return (
    <div className="bg-background min-h-screen">
      <MarketingPublicPageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        blobPosition={blobPosition}
        narrow
        titleClassName="lg:text-5xl"
      />

      <MarketingPublicPageContent narrow>
        <div className="divide-border divide-y">
          {sections.map((section) => (
            <section key={section.title} className="py-10 first:pb-10 first:pt-0">
              <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                {section.title}
              </h2>
              <div className="text-muted-foreground mt-4 space-y-4 text-base leading-relaxed">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </MarketingPublicPageContent>
    </div>
  );
}
