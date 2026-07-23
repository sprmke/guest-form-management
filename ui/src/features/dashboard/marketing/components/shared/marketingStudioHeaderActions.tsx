import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type MarketingStudioHeaderActionsContextValue = {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
};

const MarketingStudioHeaderActionsContext =
  createContext<MarketingStudioHeaderActionsContextValue | null>(null);

export function MarketingStudioHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);

  return (
    <MarketingStudioHeaderActionsContext.Provider value={value}>
      {children}
    </MarketingStudioHeaderActionsContext.Provider>
  );
}

export function MarketingStudioHeaderActionsSlot() {
  const ctx = useContext(MarketingStudioHeaderActionsContext);
  return ctx?.actions ?? null;
}

/** Register builder toolbar actions in the persistent marketing studio header. */
export function useMarketingStudioHeaderActions(actions: ReactNode) {
  const ctx = useContext(MarketingStudioHeaderActionsContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setActions(actions);
    return () => ctx.setActions(null);
  }, [actions, ctx]);
}
