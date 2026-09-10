import { useState } from 'react';

import { BookOpen, ChevronDown } from 'lucide-react';

import type { AnalyticsPlaybookArticle } from '@/features/dashboard/analytics/lib/types';

import { AdminSurfaceCardHeader } from '@/components/shared/AdminSurfaceCardHeader';
import { cn } from '@/lib/utils';

type Props = {
  articles: AnalyticsPlaybookArticle[];
  className?: string;
};

function PlaybookCard({ article }: { article: AnalyticsPlaybookArticle }) {
  const [open, setOpen] = useState(false);
  return (
    <li id={`playbook-${article.slug}`} className="border-border/60 scroll-mt-20 rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-2.5 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="text-muted-foreground block text-[11px] uppercase tracking-wide">
            {article.category}
          </span>
          <span className="text-foreground block text-sm font-medium">{article.title}</span>
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <p className="text-muted-foreground border-border/60 border-t p-2.5 pt-2 text-sm">
          {article.bodyMd}
        </p>
      ) : null}
    </li>
  );
}

export function PlaybookList({ articles, className }: Props) {
  return (
    <section
      className={cn(
        'surface-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4',
        className
      )}
    >
      <AdminSurfaceCardHeader
        icon={BookOpen}
        title="Improvement Playbook"
        description="Tips matched to this property's current numbers"
        iconClassName="bg-muted/80"
      />
      {articles.length > 0 ? (
        <ul className="space-y-2">
          {articles.map((article) => (
            <PlaybookCard key={article.slug} article={article} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nothing matched right now — check back as your numbers change.
        </p>
      )}
    </section>
  );
}
