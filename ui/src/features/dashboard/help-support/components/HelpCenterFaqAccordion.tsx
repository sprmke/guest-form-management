import * as React from 'react';

import { Search } from 'lucide-react';

import { useHelpCenterFaqs } from '@/features/dashboard/help-support/hooks/useHelpCenterFaqs';
import type { HelpCenterFaq } from '@/features/dashboard/help-support/lib/helpCenterApi';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORY_ORDER = [
  'Getting Started',
  'Bookings',
  'Parking',
  'Property Settings',
  'Team & Permissions',
  'Notifications',
  'Guest Communication',
  'Billing & Finance',
  'Maintenance & Operations',
  'AI Assistant',
];

function categorySortRank(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function matchesSearch(faq: HelpCenterFaq, term: string): boolean {
  return (
    faq.question.toLowerCase().includes(term) ||
    faq.answer.toLowerCase().includes(term) ||
    faq.category.toLowerCase().includes(term)
  );
}

export function HelpCenterFaqAccordion() {
  const { data, isPending, isError } = useHelpCenterFaqs();
  const [search, setSearch] = React.useState('');

  const groupedCategories = React.useMemo(() => {
    const faqs = data?.faqs ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term ? faqs.filter((faq) => matchesSearch(faq, term)) : faqs;

    const byCategory = new Map<string, HelpCenterFaq[]>();
    for (const faq of filtered) {
      const list = byCategory.get(faq.category) ?? [];
      list.push(faq);
      byCategory.set(faq.category, list);
    }
    return Array.from(byCategory.entries()).sort(
      ([a], [b]) => categorySortRank(a) - categorySortRank(b) || a.localeCompare(b)
    );
  }, [data?.faqs, search]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search FAQs…"
          aria-label="Search FAQs"
          className="pl-9"
        />
      </div>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <p className="text-muted-foreground text-sm">Couldn&apos;t load FAQs. Try again shortly.</p>
      ) : groupedCategories.length === 0 ? (
        <p className="text-muted-foreground text-sm">No FAQs match your search.</p>
      ) : (
        groupedCategories.map(([category, faqs]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-semibold">{category}</h3>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details key={faq.id} className="group rounded-lg border">
                  <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden">
                    {faq.question}
                  </summary>
                  <p className="text-muted-foreground border-t px-4 py-3 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
