import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { motion } from 'framer-motion';

import {
  getAppModeFromPath,
  isHostAuthPath,
  resolveModeSwitchPath,
  type AppMode,
} from '@/features/guest/auth/config/mode-switch';

import { useTheme } from '@/components/theme/ThemeProvider';
import { resolveBrandTransitionGradientStops } from '@/lib/theme/brandColor';
import { cn } from '@/lib/utils';

const TRANSITION_MS = 600;
const AUTH_CLEANUP_MS = 200;

type GradientStops = { from: string; to: string };

type MarketingBrandColorContextValue = {
  brandColor: string | null;
  setBrandColor: (hex: string | null) => void;
};

type ModeSwitchTransitionContextValue = {
  switchMode: (target: AppMode) => void;
  isTransitioning: boolean;
};

const MarketingBrandColorContext = createContext<MarketingBrandColorContextValue | null>(null);
const ModeSwitchTransitionContext = createContext<ModeSwitchTransitionContextValue | null>(null);

export function useMarketingBrandColor(): MarketingBrandColorContextValue {
  const ctx = useContext(MarketingBrandColorContext);
  if (!ctx) {
    throw new Error('useMarketingBrandColor must be used within ModeSwitchTransitionProvider');
  }
  return ctx;
}

export function useModeSwitchTransition(): ModeSwitchTransitionContextValue | null {
  return useContext(ModeSwitchTransitionContext);
}

function ModeTransitionOverlay({
  active,
  stops,
}: {
  active: boolean;
  stops: GradientStops | null;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const gradientStops = useMemo(
    () => stops ?? resolveBrandTransitionGradientStops(null, isDark),
    [stops, isDark]
  );

  return (
    <div
      id="mode-transition-overlay"
      className={cn(
        'pointer-events-none fixed inset-0 z-[100]',
        active && 'active pointer-events-auto'
      )}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <defs>
          <linearGradient id="transition-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStops.from} />
            <stop offset="100%" stopColor={gradientStops.to} />
          </linearGradient>
        </defs>
        <path
          className="mode-transition-path"
          fill="url(#transition-gradient)"
          d="M 0 100 V 100 Q 50 100 100 100 V 100 H 0"
        />
      </svg>

      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
          active ? 'opacity-100' : 'opacity-0'
        )}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white"
        />
      </div>
    </div>
  );
}

export function ModeSwitchTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const [overlayActive, setOverlayActive] = useState(false);
  const [overlayStops, setOverlayStops] = useState<GradientStops | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const switchMode = useCallback(
    async (target: AppMode) => {
      const currentMode = getAppModeFromPath(pathname);
      if (target === currentMode || isTransitioning) return;

      setOverlayStops(resolveBrandTransitionGradientStops(brandColor, resolvedTheme === 'dark'));
      setIsTransitioning(true);
      setOverlayActive(true);

      await new Promise((resolve) => setTimeout(resolve, TRANSITION_MS));

      navigate(resolveModeSwitchPath(target, pathname));

      const cleanupDelay = isHostAuthPath(pathname) ? AUTH_CLEANUP_MS : TRANSITION_MS;
      setTimeout(() => {
        setOverlayActive(false);
        setOverlayStops(null);
        setIsTransitioning(false);
      }, cleanupDelay);
    },
    [brandColor, isTransitioning, navigate, pathname, resolvedTheme]
  );

  const brandColorValue = useMemo(() => ({ brandColor, setBrandColor }), [brandColor]);

  const transitionValue = useMemo(
    () => ({ switchMode, isTransitioning }),
    [switchMode, isTransitioning]
  );

  return (
    <MarketingBrandColorContext.Provider value={brandColorValue}>
      <ModeSwitchTransitionContext.Provider value={transitionValue}>
        {children}
        <ModeTransitionOverlay active={overlayActive} stops={overlayStops} />
      </ModeSwitchTransitionContext.Provider>
    </MarketingBrandColorContext.Provider>
  );
}
