import * as React from 'react';

import { SectionNavIssueDot } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { SlidingActivePill } from '@/components/ui/SlidingActivePill';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSlidingActivePill } from '@/hooks/useSlidingActivePill';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

export type AdminSectionNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Show attention dot when this section has incomplete required fields. */
  hasIssue?: boolean;
};

export type AdminSectionNavGroup = {
  label: string;
  sections: AdminSectionNavItem[];
};

type AdminSectionNavLayoutProps = {
  /** Flat section list — used when `sectionGroups` is omitted. */
  sections?: AdminSectionNavItem[];
  /** Grouped sidebar labels (PMA templates pattern). Flattened for scroll-spy. */
  sectionGroups?: AdminSectionNavGroup[];
  children: React.ReactNode;
  className?: string;
  /** Page title block — pinned above the scroll region on desktop; scrolls with content on mobile. */
  header?: React.ReactNode;
  /** Optional action row — pinned below the scroll region on desktop; scrolls with content on mobile. */
  footer?: React.ReactNode;
};

function flattenSectionGroups(groups: AdminSectionNavGroup[]): AdminSectionNavItem[] {
  return groups.flatMap((group) => group.sections);
}

const SectionNavGroupsContext = React.createContext<AdminSectionNavGroup[] | null>(null);

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
  markerOffsetPx: number
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
  scrollRef: React.RefObject<HTMLDivElement | null>
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
    setActiveSection(findActiveSectionIdInContainer(container, sectionIds, 16));
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

function sectionNavItemClass(active: boolean, compact = false) {
  return cn(
    'flex items-center text-sm font-medium transition-colors duration-200',
    compact ? 'gap-2' : 'relative z-[1] gap-3',
    compact
      ? 'min-h-[44px] shrink-0 rounded-full px-4 py-2'
      : 'min-h-[44px] w-full rounded-lg px-3 py-2.5',
    active
      ? compact
        ? 'bg-primary text-primary-foreground'
        : 'text-primary-foreground'
      : compact
        ? 'bg-muted text-muted-foreground hover:text-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  );
}

const SectionNavButton = React.forwardRef<
  HTMLButtonElement,
  {
    section: AdminSectionNavItem;
    active: boolean;
    compact?: boolean;
    onSelect: (id: string) => void;
  }
>(function SectionNavButton({ section, active, compact = false, onSelect }, ref) {
  const Icon = section.icon;
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(section.id)}
      className={sectionNavItemClass(active, compact)}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className={compact ? 'whitespace-nowrap' : 'truncate'}>{section.label}</span>
      {section.hasIssue ? <SectionNavIssueDot className={compact ? 'ml-0.5' : 'ml-auto'} /> : null}
    </button>
  );
});

function SectionNavGroupLabel({ label }: { label: string }) {
  return (
    <div className="px-3 py-2">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

function SectionNavSeparator() {
  return <div className="border-border/60 my-2 border-t" role="separator" />;
}

const SectionNavMobileStrip = React.memo(function SectionNavMobileStrip() {
  const store = useSectionNavStore();
  const sectionGroups = React.useContext(SectionNavGroupsContext);
  const activeSection = React.useSyncExternalStore(store.subscribe, store.getActiveSection);
  const sections = React.useSyncExternalStore(store.subscribe, store.getSections);

  if (sectionGroups?.length) {
    return (
      <div className="space-y-2 pb-2 lg:hidden">
        {sectionGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 ? <SectionNavSeparator /> : null}
            <SectionNavGroupLabel label={group.label} />
            <div className="overflow-x-auto">
              <div className="flex w-max min-w-0 gap-2">
                {group.sections.map((section) => (
                  <SectionNavButton
                    key={section.id}
                    section={section}
                    active={activeSection === section.id}
                    compact
                    onSelect={store.scrollToSection}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2 lg:hidden">
      <div className="flex w-max min-w-0 gap-2">
        {sections.map((section) => (
          <SectionNavButton
            key={section.id}
            section={section}
            active={activeSection === section.id}
            compact
            onSelect={store.scrollToSection}
          />
        ))}
      </div>
    </div>
  );
});

const SectionNavList = React.memo(function SectionNavList({ className }: { className?: string }) {
  const store = useSectionNavStore();
  const sectionGroups = React.useContext(SectionNavGroupsContext);
  const activeSection = React.useSyncExternalStore(store.subscribe, store.getActiveSection);
  const sections = React.useSyncExternalStore(store.subscribe, store.getSections);
  const sectionIdsKey = React.useMemo(
    () => sections.map((section) => section.id).join('\0'),
    [sections]
  );
  const groupStructureKey = React.useMemo(
    () =>
      sectionGroups
        ?.map((group) => `${group.label}:${group.sections.map((section) => section.id).join(',')}`)
        .join('\0') ?? '',
    [sectionGroups]
  );
  const { containerRef, setItemRef, bounds } = useSlidingActivePill(activeSection || null, [
    sectionIdsKey,
    groupStructureKey,
  ]);

  if (sectionGroups?.length) {
    return (
      <nav
        ref={containerRef}
        className={cn('relative space-y-1', className)}
        aria-label="Page sections"
      >
        {bounds ? (
          <SlidingActivePill bounds={bounds} className="bg-primary rounded-lg shadow-sm" />
        ) : null}
        {sectionGroups.map((group, groupIndex) => (
          <React.Fragment key={group.label}>
            {groupIndex > 0 ? <SectionNavSeparator /> : null}
            <SectionNavGroupLabel label={group.label} />
            {group.sections.map((section) => (
              <SectionNavButton
                key={section.id}
                ref={setItemRef(section.id)}
                section={section}
                active={activeSection === section.id}
                onSelect={store.scrollToSection}
              />
            ))}
          </React.Fragment>
        ))}
      </nav>
    );
  }

  return (
    <nav
      ref={containerRef}
      className={cn('relative space-y-1', className)}
      aria-label="Page sections"
    >
      {bounds ? (
        <SlidingActivePill bounds={bounds} className="bg-primary rounded-lg shadow-sm" />
      ) : null}
      {sections.map((section) => (
        <SectionNavButton
          key={section.id}
          ref={setItemRef(section.id)}
          section={section}
          active={activeSection === section.id}
          onSelect={store.scrollToSection}
        />
      ))}
    </nav>
  );
});

export function AdminSectionNavLayout({
  sections,
  sectionGroups,
  children,
  className,
  header,
  footer,
}: AdminSectionNavLayoutProps) {
  const resolvedSections = React.useMemo(
    () => (sectionGroups?.length ? flattenSectionGroups(sectionGroups) : (sections ?? [])),
    [sectionGroups, sections]
  );

  const contentScrollRef = React.useRef<HTMLDivElement>(null);
  const storeRef = React.useRef<InternalSectionNavStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createSectionNavStore(resolvedSections, contentScrollRef);
  }

  const store = storeRef.current;

  React.useEffect(() => {
    store._updateSections(resolvedSections);
  }, [resolvedSections, store]);

  React.useLayoutEffect(() => {
    store._attach();
    return () => {
      store._detach();
    };
  }, [store]);

  return (
    <SectionNavStoreContext.Provider value={store}>
      <SectionNavGroupsContext.Provider value={sectionGroups ?? null}>
        <div
          className={cn(
            'flex min-h-0 flex-col',
            'lg:h-[calc(100dvh-2.5rem)] lg:overflow-hidden',
            className
          )}
        >
          {header ? (
            <div className="bg-background relative z-20 hidden shrink-0 lg:block">{header}</div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-8 lg:overflow-hidden xl:gap-10">
            <aside className="bg-background relative z-10 hidden w-56 shrink-0 self-start lg:block">
              <div className="sticky top-24 space-y-4">
                <Card>
                  <CardContent className="p-2">
                    <SectionNavList />
                  </CardContent>
                </Card>
              </div>
            </aside>

            <div
              ref={contentScrollRef}
              className="min-h-0 flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain"
            >
              {header ? <div className="pb-3 lg:hidden">{header}</div> : null}
              <SectionNavMobileStrip />
              <div className="mx-auto w-full max-w-4xl space-y-6">{children}</div>
              {footer ? (
                <div className="border-separator mt-3 border-t pt-3 lg:hidden">{footer}</div>
              ) : null}
            </div>
          </div>

          {footer ? (
            <div className="border-separator bg-background relative z-20 hidden shrink-0 border-t pt-3 lg:block">
              {footer}
            </div>
          ) : null}
        </div>
      </SectionNavGroupsContext.Provider>
    </SectionNavStoreContext.Provider>
  );
}

type AdminSectionGroupHeadingProps = {
  title: string;
  count?: number;
  action?: React.ReactNode;
  className?: string;
};

/** Main-content group title (PMA templates page pattern). */
export function AdminSectionGroupHeading({
  title,
  count,
  action,
  className,
}: AdminSectionGroupHeadingProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {count != null ? (
          <span className="bg-muted text-muted-foreground inline-flex min-h-[22px] items-center rounded-full px-2 text-xs font-medium">
            {count}
          </span>
        ) : null}
      </div>
      {action}
    </div>
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
    <Card
      id={`section-${id}`}
      className={cn(
        'scroll-mt-2',
        '[contain-intrinsic-size:auto_28rem] [content-visibility:auto]',
        className
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null}
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
});
