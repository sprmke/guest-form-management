import { useEffect, useRef, useState } from 'react';

import type { StayGuideChapterNavItem } from '@/features/guest/stay-guide/lib/stayGuideChapters';

import { cn } from '@/lib/utils';

interface StayGuideQuickNavProps {
  items: StayGuideChapterNavItem[];
}

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Sticky pill quick-nav — jump-scrolls to chapter anchors, highlights the one in view. */
export function StayGuideTabs({ items }: StayGuideQuickNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-[#171717]/10 bg-[#FFFFFF]/95 backdrop-blur-md dark:border-[#FAFAFA]/10 dark:bg-[#0A0A0A]/95">
      <nav
        aria-label="Stay guide chapters"
        className="mx-auto flex max-w-[720px] gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToAnchor(item.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-[#737373] hover:bg-[#171717]/5 dark:text-[#A3A3A3] dark:hover:bg-[#FAFAFA]/5'
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {item.shortLabel}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
