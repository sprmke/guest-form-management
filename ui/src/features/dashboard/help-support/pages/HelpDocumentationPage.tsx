import * as React from 'react';

import { Search } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { useHelpCenterArticles } from '@/features/dashboard/help-support/hooks/useHelpCenterArticles';
import type { HelpCenterArticle } from '@/features/dashboard/help-support/lib/helpCenterApi';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/lib/pageTitle';

const MODULE_ORDER = ['Org', 'Property', 'Parking'];

function moduleSortRank(module: string): number {
  const index = MODULE_ORDER.indexOf(module);
  return index === -1 ? MODULE_ORDER.length : index;
}

/** Keeps an article only if its title or at least one Q&A entry matches the search term. */
function filterArticleQaItems(article: HelpCenterArticle, term: string): HelpCenterArticle | null {
  if (article.title.toLowerCase().includes(term)) return article;
  const qaItems = article.qaItems.filter(
    (qa) => qa.question.toLowerCase().includes(term) || qa.answer.toLowerCase().includes(term)
  );
  return qaItems.length > 0 ? { ...article, qaItems } : null;
}

export function HelpDocumentationPage() {
  usePageTitle('Documentation');
  const { data, isPending, isError } = useHelpCenterArticles();
  const [search, setSearch] = React.useState('');

  const groupedModules = React.useMemo(() => {
    const articles = data?.articles ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? articles.reduce<HelpCenterArticle[]>((acc, article) => {
          const match = filterArticleQaItems(article, term);
          if (match) acc.push(match);
          return acc;
        }, [])
      : articles;

    const byModule = new Map<string, HelpCenterArticle[]>();
    for (const article of filtered) {
      const list = byModule.get(article.module) ?? [];
      list.push(article);
      byModule.set(article.module, list);
    }
    return Array.from(byModule.entries()).sort(
      ([a], [b]) => moduleSortRank(a) - moduleSortRank(b) || a.localeCompare(b)
    );
  }, [data?.articles, search]);

  const hasSearch = search.trim().length > 0;

  return (
    <AdminMobilePage title="Documentation" titleId="help-documentation-heading">
      <div className="space-y-4 sm:space-y-6">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documentation…"
            aria-label="Search documentation"
            className="pl-9"
          />
        </div>

        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <p className="text-muted-foreground text-sm">
            Couldn&apos;t load documentation. Try again shortly.
          </p>
        ) : groupedModules.length === 0 ? (
          <p className="text-muted-foreground text-sm">No articles match your search.</p>
        ) : (
          groupedModules.map(([moduleName, articles]) => (
            <AdminSection key={moduleName} id={moduleName.toLowerCase()} title={moduleName}>
              <div className="space-y-2">
                {articles.map((article) => (
                  <details
                    key={article.routeGuidePath}
                    open={hasSearch}
                    className="group rounded-lg border"
                  >
                    <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden">
                      {article.title}
                    </summary>
                    <dl className="space-y-3 border-t px-4 py-3">
                      {article.qaItems.map((qa) => (
                        <div key={qa.question}>
                          <dt className="text-sm font-medium">{qa.question}</dt>
                          <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">
                            {qa.answer}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ))}
              </div>
            </AdminSection>
          ))
        )}
      </div>
    </AdminMobilePage>
  );
}
