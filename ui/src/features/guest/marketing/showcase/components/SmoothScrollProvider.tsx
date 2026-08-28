import { createContext, useContext, useMemo, type ReactNode } from 'react';

type SmoothScrollApi = {
  scrollToAnchor: (id: string) => void;
  enabled: boolean;
};

const SmoothScrollContext = createContext<SmoothScrollApi>({
  scrollToAnchor: (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  enabled: false,
});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

/**
 * Native scroll only — Lenis was intercepting wheel events and freezing
 * nested scrollports (Page Editor preview pane) and some guest views.
 */
export function SmoothScrollProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const api = useMemo<SmoothScrollApi>(
    () => ({
      enabled,
      scrollToAnchor: (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({
          behavior: enabled ? 'smooth' : 'auto',
          block: 'start',
        });
      },
    }),
    [enabled]
  );

  return <SmoothScrollContext.Provider value={api}>{children}</SmoothScrollContext.Provider>;
}
