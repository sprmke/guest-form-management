import * as React from 'react';

import { useAdminLayoutFillMain } from '@/features/dashboard/bookings/components/AdminLayout';
import { SectionNavIssueDot } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlidingActivePill } from '@/components/ui/SlidingActivePill';
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

const SCROLL_MARKER_OFFSET_PX = 24;
/** Only treat the scrollport as "at bottom" when essentially flush with the end. */
const SCROLL_BOTTOM_SLACK_PX = 12;
const MIN_VISIBLE_SECTION_PX = 32;
/** At true bottom, last section wins when it holds this share of the prior section's visible area. */
const BOTTOM_LAST_SECTION_VISIBLE_RATIO = 0.4;

function sectionVisibleHeight(rect: DOMRect, containerRect: DOMRect): number {
  const top = Math.max(rect.top, containerRect.top);
  const bottom = Math.min(rect.bottom, containerRect.bottom);
  return Math.max(0, bottom - top);
}

function isScrollAtBottom(container: HTMLElement, slackPx: number): boolean {
  return container.scrollTop + container.clientHeight >= container.scrollHeight - slackPx;
}

function findActiveSectionIdInContainer(
  container: HTMLElement,
  sectionIds: string[],
  markerOffsetPx: number = SCROLL_MARKER_OFFSET_PX
): string {
  if (sectionIds.length === 0) return '';

  const containerRect = container.getBoundingClientRect();
  const markerY = containerRect.top + markerOffsetPx;

  const entries = sectionIds
    .map((id) => {
      const el = document.getElementById(`section-${id}`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { id, rect, visible: sectionVisibleHeight(rect, containerRect) };
    })
    .filter((entry): entry is { id: string; rect: DOMRect; visible: number } => entry !== null);

  if (entries.length === 0) return sectionIds[0] ?? '';

  if (isScrollAtBottom(container, SCROLL_BOTTOM_SLACK_PX)) {
    const last = entries[entries.length - 1]!;
    if (last.visible >= MIN_VISIBLE_SECTION_PX) {
      const previous = entries[entries.length - 2];
      if (!previous || last.visible >= previous.visible * BOTTOM_LAST_SECTION_VISIBLE_RATIO) {
        return last.id;
      }
    }
  }

  let bestIndex = 0;
  let bestVisible = entries[0]!.visible;

  for (let i = 1; i < entries.length; i++) {
    if (entries[i]!.visible > bestVisible) {
      bestVisible = entries[i]!.visible;
      bestIndex = i;
    }
  }

  if (bestVisible > 0) {
    return entries[bestIndex]!.id;
  }

  let active = entries[0]!.id;
  for (const entry of entries) {
    if (entry.rect.top <= markerY) active = entry.id;
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

  let programmaticTarget: string | null = null;
  let detachScrollEnd: (() => void) | null = null;

  const clearProgrammaticScroll = (targetSectionId: string) => {
    if (programmaticTarget !== targetSectionId) return;
    programmaticTarget = null;
    isProgrammaticScroll = false;
    detachScrollEnd?.();
    detachScrollEnd = null;
    if (programmaticScrollTimer) {
      clearTimeout(programmaticScrollTimer);
      programmaticScrollTimer = null;
    }
    setActiveSection(targetSectionId);
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    programmaticTarget = sectionId;
    isProgrammaticScroll = true;

    detachScrollEnd?.();
    if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);

    const element = document.getElementById(`section-${sectionId}`);
    const container = scrollRef.current;

    const finish = () => clearProgrammaticScroll(sectionId);

    if (container && element) {
      const onScrollEnd = () => finish();
      container.addEventListener('scrollend', onScrollEnd, { once: true });
      detachScrollEnd = () => container.removeEventListener('scrollend', onScrollEnd);

      const containerTop = container.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      const top = elementTop - containerTop + container.scrollTop - 8;
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

      // Fallback when scrollend is unsupported or smooth scroll is interrupted.
      programmaticScrollTimer = setTimeout(finish, 2500);
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      programmaticScrollTimer = setTimeout(finish, 2500);
    } else {
      finish();
    }
  };

  const syncActiveFromScroll = () => {
    if (isProgrammaticScroll) return;
    const container = scrollRef.current;
    if (!container) return;
    setActiveSection(findActiveSectionIdInContainer(container, sectionIds));
  };

  const onScroll = () => {
    if (isProgrammaticScroll) return;
    if (scrollThrottleTimer) return;
    scrollThrottleTimer = setTimeout(() => {
      scrollThrottleTimer = null;
      syncActiveFromScroll();
    }, 50);
  };

  const attachScroll = () => {
    detachScroll?.();

    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener('scroll', onScroll, { passive: true });
    syncActiveFromScroll();

    const resizeObserver = new ResizeObserver(() => {
      syncActiveFromScroll();
    });
    resizeObserver.observe(container);

    detachScroll = () => {
      container.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      detachScrollEnd?.();
      detachScrollEnd = null;
      if (scrollThrottleTimer) clearTimeout(scrollThrottleTimer);
      if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
      programmaticTarget = null;
      isProgrammaticScroll = false;
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
      syncActiveFromScroll();
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
  const navItemRefs = React.useRef<Record<string, HTMLElement | null>>({});
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

  const setNavItemRef = React.useCallback(
    (id: string) => (node: HTMLElement | null) => {
      navItemRefs.current[id] = node;
      setItemRef(id)(node);
    },
    [setItemRef]
  );

  React.useEffect(() => {
    if (!activeSection) return;
    const navItem = navItemRefs.current[activeSection];
    const navScrollParent = navItem?.closest('[data-section-nav-scroll]');
    if (!navItem || !navScrollParent) return;
    const navRect = navItem.getBoundingClientRect();
    const parentRect = navScrollParent.getBoundingClientRect();
    if (navRect.top < parentRect.top || navRect.bottom > parentRect.bottom) {
      navItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeSection, sectionIdsKey, groupStructureKey]);

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
                ref={setNavItemRef(section.id)}
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
          ref={setNavItemRef(section.id)}
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
  useAdminLayoutFillMain(true);

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
        <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
          {header ? (
            <div className="bg-background relative z-20 hidden shrink-0 lg:block">{header}</div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:gap-8 xl:gap-10">
            <aside className="bg-background relative z-10 hidden w-56 shrink-0 lg:block lg:self-start">
              <Card>
                <CardContent
                  data-section-nav-scroll
                  className="max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain p-2"
                >
                  <SectionNavList />
                </CardContent>
              </Card>
            </aside>

            <div
              ref={contentScrollRef}
              className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
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
    <Card id={`section-${id}`} className={cn('scroll-mt-2', className)}>
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
