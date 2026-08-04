import type {
  SidebarNavItem,
  SidebarNavSection,
} from '@/features/dashboard/bookings/lib/adminSidebarNav';

import type { BottomTabItem } from '@/components/mobile/BottomTabBar';
import { MORE_TAB_KEY, moreTabItem } from '@/components/mobile/BottomTabBar';

const MAX_PRIMARY_TABS = 3;

export function flattenNavigableNavItems(sections: SidebarNavSection[]): SidebarNavItem[] {
  return sections.flatMap((section) =>
    section.items.filter((item): item is SidebarNavItem & { href: string } =>
      Boolean(item.href && !item.disabled)
    )
  );
}

/**
 * Split permission-filtered sidebar nav into primary bottom tabs + full list for the More sheet.
 * Primary tabs keep the first N items for quick access; More includes every page (including those).
 */
export function splitAdminBottomNav(
  sections: SidebarNavSection[],
  onMoreClick: () => void
): { tabItems: BottomTabItem[]; moreItems: SidebarNavItem[]; primaryHrefs: string[] } {
  const navigable = flattenNavigableNavItems(sections);
  const primary = navigable.slice(0, MAX_PRIMARY_TABS);
  // Full nav in More — mirrors desktop sidebar, not only overflow past the dock.
  const moreItems = navigable;

  const tabItems: BottomTabItem[] = [
    ...primary.map((item) => ({
      key: item.href!,
      label: item.label,
      href: item.href,
      Icon: item.Icon,
    })),
    moreTabItem(onMoreClick),
  ];

  return {
    tabItems,
    moreItems,
    primaryHrefs: primary.map((item) => item.href!),
  };
}

export function resolveBottomTabActiveKey(
  activeNavHref: string | null,
  primaryHrefs: string[],
  moreOpen: boolean
): string | null {
  if (moreOpen) return MORE_TAB_KEY;
  if (activeNavHref && primaryHrefs.includes(activeNavHref)) return activeNavHref;
  if (activeNavHref) return MORE_TAB_KEY;
  return primaryHrefs[0] ?? null;
}
