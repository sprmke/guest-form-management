import { useCallback, useState } from 'react';

export type MarketingSidebarLayoutKey = 'calendar' | 'design' | 'video';

/** Shared default width (px) for Calendar, Design, and Video sidebars. */
export const MARKETING_SIDEBAR_DEFAULT_WIDTH = 288;

/** Collapsed rail width (px) — matches w-11. */
export const MARKETING_SIDEBAR_COLLAPSED_WIDTH = 44;

/** Drag below this width (px) on release → collapsed sidebar. */
export const MARKETING_SIDEBAR_COLLAPSE_THRESHOLD = 160;

const MIN_WIDTH = 220;
const MAX_WIDTH = 480;

type StoredLayout = {
  width: number;
  collapsed: boolean;
};

function storageKey(layoutKey: MarketingSidebarLayoutKey) {
  return `marketing-editor-sidebar:${layoutKey}`;
}

function clampExpandedWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
}

function clampResizePreview(width: number) {
  return Math.min(MAX_WIDTH, Math.max(0, Math.round(width)));
}

function loadLayout(layoutKey: MarketingSidebarLayoutKey): StoredLayout {
  if (typeof window === 'undefined') {
    return { width: MARKETING_SIDEBAR_DEFAULT_WIDTH, collapsed: false };
  }
  try {
    const raw = window.localStorage.getItem(storageKey(layoutKey));
    if (!raw) {
      return { width: MARKETING_SIDEBAR_DEFAULT_WIDTH, collapsed: false };
    }
    const parsed = JSON.parse(raw) as Partial<StoredLayout>;
    return {
      width: clampExpandedWidth(parsed.width ?? MARKETING_SIDEBAR_DEFAULT_WIDTH),
      collapsed: Boolean(parsed.collapsed),
    };
  } catch {
    return { width: MARKETING_SIDEBAR_DEFAULT_WIDTH, collapsed: false };
  }
}

function saveLayout(layoutKey: MarketingSidebarLayoutKey, layout: StoredLayout) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(layoutKey), JSON.stringify(layout));
}

export function useMarketingSidebarLayout(layoutKey: MarketingSidebarLayoutKey) {
  const [layout, setLayout] = useState<StoredLayout>(() => loadLayout(layoutKey));

  const setWidth = useCallback(
    (width: number, persist = true) => {
      const nextWidth = persist ? clampExpandedWidth(width) : clampResizePreview(width);
      setLayout((prev) => {
        const next = { ...prev, width: nextWidth };
        if (persist) saveLayout(layoutKey, next);
        return next;
      });
    },
    [layoutKey]
  );

  const finishResize = useCallback(
    (width: number, expandedWidthBeforeDrag: number) => {
      if (width < MARKETING_SIDEBAR_COLLAPSE_THRESHOLD) {
        setLayout((prev) => {
          const next = {
            collapsed: true,
            width: clampExpandedWidth(expandedWidthBeforeDrag),
          };
          saveLayout(layoutKey, next);
          return next;
        });
        return;
      }

      setLayout((prev) => {
        const next = {
          collapsed: false,
          width: clampExpandedWidth(width),
        };
        saveLayout(layoutKey, next);
        return next;
      });
    },
    [layoutKey]
  );

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      setLayout((prev) => {
        const next = { ...prev, collapsed };
        saveLayout(layoutKey, next);
        return next;
      });
    },
    [layoutKey]
  );

  const expandSidebar = useCallback(() => {
    setLayout((prev) => {
      const next = {
        collapsed: false,
        width: MARKETING_SIDEBAR_DEFAULT_WIDTH,
      };
      saveLayout(layoutKey, next);
      return next;
    });
  }, [layoutKey]);

  return {
    width: layout.width,
    collapsed: layout.collapsed,
    setWidth,
    setCollapsed,
    expandSidebar,
    finishResize,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    defaultWidth: MARKETING_SIDEBAR_DEFAULT_WIDTH,
    collapseThreshold: MARKETING_SIDEBAR_COLLAPSE_THRESHOLD,
  };
}
