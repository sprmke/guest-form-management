import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getShowcaseThemeTokens,
  resolveShowcaseInitialMode,
  showcaseThemeStorageKey,
  type ShowcaseColorMode,
  type ShowcaseThemeTokens,
  type ShowcaseVariant,
} from '@/features/guest/marketing/showcase/lib/showcaseThemeTokens';
import type { PropertyShowcaseConfig } from '@/features/guest/marketing/showcase/types/showcase';

type ShowcaseThemeContextValue = {
  mode: ShowcaseColorMode;
  variant: ShowcaseVariant;
  tokens: ShowcaseThemeTokens;
  toggleMode: () => void;
  setMode: (mode: ShowcaseColorMode) => void;
};

const ShowcaseThemeContext = createContext<ShowcaseThemeContextValue | null>(null);

function readStoredMode(
  propertySlug: string,
  variant: ShowcaseVariant,
  fallback: ShowcaseColorMode
): ShowcaseColorMode {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(showcaseThemeStorageKey(propertySlug, variant));
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function ShowcaseThemeProvider({
  variant,
  propertySlug,
  config,
  configControlled = false,
  children,
}: {
  variant: ShowcaseVariant;
  propertySlug: string;
  config: PropertyShowcaseConfig;
  /** When true (Page Editor preview), mode follows config.palette.mode — no localStorage. */
  configControlled?: boolean;
  children: ReactNode;
}) {
  const defaultMode = resolveShowcaseInitialMode(config.palette.mode);
  const [mode, setModeState] = useState<ShowcaseColorMode>(() =>
    configControlled ? defaultMode : readStoredMode(propertySlug, variant, defaultMode)
  );

  useEffect(() => {
    if (!configControlled) return;
    setModeState(resolveShowcaseInitialMode(config.palette.mode));
  }, [configControlled, config.palette.mode]);

  const setMode = useCallback(
    (next: ShowcaseColorMode) => {
      setModeState(next);
      if (configControlled) return;
      try {
        localStorage.setItem(showcaseThemeStorageKey(propertySlug, variant), next);
      } catch {
        /* ignore */
      }
    },
    [configControlled, propertySlug, variant]
  );

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const tokens = useMemo(() => getShowcaseThemeTokens(variant, mode), [variant, mode]);

  const value = useMemo(
    () => ({ mode, variant, tokens, toggleMode, setMode }),
    [mode, variant, tokens, toggleMode, setMode]
  );

  return <ShowcaseThemeContext.Provider value={value}>{children}</ShowcaseThemeContext.Provider>;
}

export function useShowcaseTheme() {
  const ctx = useContext(ShowcaseThemeContext);
  if (!ctx) {
    throw new Error('useShowcaseTheme must be used within ShowcaseThemeProvider');
  }
  return ctx;
}
