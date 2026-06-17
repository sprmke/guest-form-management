import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdminSectionNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type AdminSectionNavLayoutProps = {
  sections: AdminSectionNavItem[];
  children: React.ReactNode;
  className?: string;
  /** Page title block — pinned above the scroll region on desktop; scrolls with content on mobile. */
  header?: React.ReactNode;
  /** Optional action row — pinned below the scroll region on desktop; scrolls with content on mobile. */
  footer?: React.ReactNode;
};

type SectionNavStore = {
  subscribe: (listener: () => void) => () => void;
  getActiveSection: () => string;
  getSections: () => AdminSectionNavItem[];
  scrollToSection: (sectionId: string) => void;
};

const SectionNavStoreContext = React.createContext<SectionNavStore | null>(null);

function useSectionNavStore(): SectionNavStore {
  const store = React.useContext(SectionNavStoreContext);
  if (!store) {
    throw new Error('useSectionNavStore must be used within AdminSectionNavLayout');
  }
  return store;
}

function findActiveSectionIdInContainer(
  container: HTMLElement,
  sectionIds: string[],
  markerOffsetPx: number,
): string {
  if (sectionIds.length === 0) return '';
  const marker = container.getBoundingClientRect().top + markerOffsetPx;
  let active = sectionIds[0]!;
  for (const id of sectionIds) {
    const el = document.getElementById(`section-${id}`);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= marker) active = id;
  }
  return active;
}

type InternalSectionNavStore = SectionNavStore & {
  _attach: () => void;
  _detach: () => void;
  _updateSections: (sections: AdminSectionNavItem[]) => void;
};

function createSectionNavStore(
  sections: AdminSectionNavItem[],
  scrollRef: React.RefObject<HTMLDivElement | null>,
): InternalSectionNavStore {
  let activeSection = sections[0]?.id ?? '';
  const listeners = new Set<() => void>();
  let isProgrammaticScroll = false;
  let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null;
  let scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  let sectionIds = sections.map((section) => section.id);
  let currentSections = sections;
  let detachScroll: (() => void) | null = null;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const setActiveSection = (next: string) => {
    if (next === activeSection) return;
    activeSection = next;
    notify();
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    isProgrammaticScroll = true;

    const element = document.getElementById(`section-${sectionId}`);
    const container = scrollRef.current;

    if (container && element) {
      const containerTop = container.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      const top = elementTop - containerTop + container.scrollTop - 8;
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
    programmaticScrollTimer = setTimeout(() => {
      isProgrammaticScroll = false;
    }, 600);
  };

  const syncActiveFromScroll = () => {
    if (isProgrammaticScroll) return;
    const container = scrollRef.current;
    if (!container) return;
    setActiveSection(
      findActiveSectionIdInContainer(container, sectionIds, 16),
    );
  };

  const onScroll = () => {
    if (isProgrammaticScroll) return;
    if (scrollThrottleTimer) return;
    scrollThrottleTimer = setTimeout(() => {
      scrollThrottleTimer = null;
      syncActiveFromScroll();
    }, 100);
  };

  const attachScroll = () => {
    detachScroll?.();

    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener('scroll', onScroll, { passive: true });
    syncActiveFromScroll();

    detachScroll = () => {
      container.removeEventListener('scroll', onScroll);
      if (scrollThrottleTimer) clearTimeout(scrollThrottleTimer);
      if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
    };
  };

  const store: SectionNavStore = {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getActiveSection: () => activeSection,
    getSections: () => currentSections,
    scrollToSection,
  };

  return Object.assign(store, {
    _attach: attachScroll,
    _detach: () => detachScroll?.(),
    _updateSections: (nextSections: AdminSectionNavItem[]) => {
      currentSections = nextSections;
      sectionIds = nextSections.map((section) => section.id);
      if (!sectionIds.includes(activeSection)) {
        setActiveSection(sectionIds[0] ?? '');
      }
    },
  });
}

function sectionNavItemClass(active: boolean) {
  return cn(
    'flex w-full min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
    active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );
}

const SectionNavList = React.memo(function SectionNavList({
  className,
}: {
  className?: string;
}) {
  const store = useSectionNavStore();
  const activeSection = React.useSyncExternalStore(
    store.subscribe,
    store.getActiveSection,
  );
  const sections = React.useSyncExternalStore(
    store.subscribe,
    store.getSections,
  );

  return (
    <nav
      className={cn('surface-card space-y-1 p-2', className)}
      aria-label="Page sections"
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const active = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => store.scrollToSection(section.id)}
            className={sectionNavItemClass(active)}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
});

export function AdminSectionNavLayout({
  sections,
  children,
  className,
  header,
  footer,
}: AdminSectionNavLayoutProps) {
  const contentScrollRef = React.useRef<HTMLDivElement>(null);
  const storeRef = React.useRef<InternalSectionNavStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createSectionNavStore(sections, contentScrollRef);
  }

  const store = storeRef.current;

  React.useEffect(() => {
    store._updateSections(sections);
  }, [sections, store]);

  React.useLayoutEffect(() => {
    store._attach();
    return () => {
      store._detach();
    };
  }, [store]);

  return (
    <SectionNavStoreContext.Provider value={store}>
      <div
        className={cn(
          'flex min-h-0 flex-col',
          'lg:h-[calc(100dvh-2.5rem)] lg:overflow-hidden',
          className,
        )}
      >
        {header ? (
          <div className="relative z-20 hidden shrink-0 bg-background pb-3 lg:block">
            {header}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-6 lg:overflow-hidden">
          <div className="relative z-10 hidden w-56 shrink-0 self-start bg-background lg:block">
            <SectionNavList />
          </div>

          <div
            ref={contentScrollRef}
            className="min-h-0 flex-1 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain"
          >
            {header ? <div className="pb-3 lg:hidden">{header}</div> : null}
            <div className="space-y-3 sm:space-y-4">{children}</div>
            {footer ? (
              <div className="mt-3 border-t border-separator pt-3 lg:hidden">
                {footer}
              </div>
            ) : null}
          </div>
        </div>

        {footer ? (
          <div className="relative z-20 hidden shrink-0 border-t border-separator bg-background pt-3 lg:block">
            {footer}
          </div>
        ) : null}
      </div>
    </SectionNavStoreContext.Provider>
  );
}

type AdminSectionProps = {
  id: string;
  title: string;
  icon?: LucideIcon;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export const AdminSection = React.memo(function AdminSection({
  id,
  title,
  icon: Icon,
  description,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section
      id={`section-${id}`}
      className={cn(
        'surface-card scroll-mt-2 p-3 sm:p-4',
        '[content-visibility:auto] [contain-intrinsic-size:auto_28rem]',
        className,
      )}
    >
      <header className="mb-4 space-y-1">
        <h2 className="text-card-title flex items-center gap-2">
          {Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null}
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
});
