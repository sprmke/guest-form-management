import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Moon, Sun, X } from 'lucide-react';

import { ShowcaseFooter } from '@/features/guest/marketing/showcase/components/ShowcaseFooter';
import {
  SmoothScrollProvider,
  useSmoothScroll,
} from '@/features/guest/marketing/showcase/components/SmoothScrollProvider';
import {
  ShowcaseThemeProvider,
  useShowcaseTheme,
} from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import {
  ShowcaseStyleProvider,
  useShowcaseStyle,
} from '@/features/guest/marketing/showcase/components/ShowcaseStyleProvider';
import {
  useShowcaseConfigControlled,
  useShowcaseContainedChrome,
} from '@/features/guest/marketing/showcase/lib/showcaseChrome';
import { scrollShowcaseToTop } from '@/features/guest/marketing/showcase/lib/showcaseScroll';
import {
  resolveShowcaseWarmTintClass,
  showcasePrimaryCssVar,
} from '@/features/guest/marketing/showcase/lib/showcaseStyleConfig';
import { useScrollSpy } from '@/features/guest/marketing/showcase/hooks/useScrollSpy';
import type { ShowcaseData } from '@/features/guest/marketing/showcase/types/showcase';
import { usePreviewForcesMobile } from '@/features/guest/lib/previewViewportContext';
import { useFavicon } from '@/lib/favicon';
import { usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';

function ShowcaseThemeToggle({ hidden, className }: { hidden?: boolean; className?: string }) {
  const { mode, toggleMode, tokens } = useShowcaseTheme();

  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(
        'flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200',
        className ?? tokens.themeToggleHover
      )}
      aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {mode === 'dark' ? (
        <Sun className="size-5" aria-hidden />
      ) : (
        <Moon className="size-5" aria-hidden />
      )}
    </button>
  );
}

function ShowcaseBrand({ data }: { data: ShowcaseData }) {
  const { tokens, variant } = useShowcaseTheme();
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(data.logoUrl) && !logoFailed;

  return (
    <button
      type="button"
      onClick={() => scrollShowcaseToTop()}
      className="@lg:max-w-[40%] flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 overflow-hidden text-left"
      aria-label="Back to top"
    >
      {showLogo ? (
        <span
          className={cn(
            'size-9 shrink-0 overflow-hidden rounded-md shadow-sm sm:size-10',
            tokens.brandLogoBg
          )}
        >
          <img
            src={data.logoUrl!}
            alt=""
            className="size-full object-cover object-center"
            onError={() => setLogoFailed(true)}
          />
        </span>
      ) : (
        <span
          className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-bold sm:size-10',
            tokens.brandFallback,
            variant === 'monolith' && 'rounded-none'
          )}
        >
          {data.propertyName.charAt(0).toUpperCase()}
        </span>
      )}
      <p className="truncate text-base font-medium">{data.propertyName}</p>
    </button>
  );
}

function useMonolithHeaderSolid(data: ShowcaseData, variant: string) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    if (variant !== 'monolith') {
      setSolid(false);
      return;
    }

    const hero = document.getElementById('hero');
    if (!hero) {
      setSolid(true);
      return;
    }

    const root =
      document.querySelector<HTMLElement>('[data-showcase-scroll-root]') ??
      document.querySelector<HTMLElement>('.showcase-scope');

    const observer = new IntersectionObserver(
      ([entry]) => {
        setSolid(!entry?.isIntersecting || (entry.intersectionRatio ?? 0) < 0.55);
      },
      {
        root: root && root !== document.documentElement ? root : null,
        threshold: [0, 0.55, 1],
      }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [data.propertySlug, data.templateKey, variant]);

  return solid;
}

function ShowcaseNav({ data, containedChrome }: { data: ShowcaseData; containedChrome: boolean }) {
  const { scrollToAnchor } = useSmoothScroll();
  const { tokens, variant } = useShowcaseTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const forceMobile = usePreviewForcesMobile();
  const configControlled = useShowcaseConfigControlled();
  const navSections = data.sections.filter((s) => s.id !== 'hero').slice(0, 6);
  const ids = data.sections.map((s) => s.id);
  const active = useScrollSpy(ids);
  const monolithHeaderSolid = useMonolithHeaderSolid(data, variant);
  const heroSection = data.sections.find((section) => section.id === 'hero');
  const heroHasImage = Boolean(heroSection?.images[0]);
  const monolithOverlay = variant === 'monolith' && !monolithHeaderSolid;
  const monolithOnDarkHero = monolithOverlay && heroHasImage;

  useEffect(() => {
    if (!menuOpen || forceMobile || containedChrome) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen, forceMobile, containedChrome]);

  function goTo(id: string) {
    setMenuOpen(false);
    window.setTimeout(() => scrollToAnchor(id), 40);
  }

  return (
    <header
      className={cn(
        'inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter,color] duration-300',
        containedChrome ? 'sticky' : 'fixed',
        monolithOverlay
          ? cn(
              'border-transparent bg-transparent backdrop-blur-none',
              monolithOnDarkHero ? 'text-white' : 'text-inherit'
            )
          : cn('border-b', tokens.header)
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <ShowcaseBrand data={data} />

        <nav
          className={cn('ml-auto hidden shrink-0 items-center gap-0.5', !forceMobile && '@lg:flex')}
          aria-label="Showcase sections"
        >
          {navSections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToAnchor(section.id)}
              className={cn(
                'min-h-11 cursor-pointer rounded-full px-2.5 text-sm font-medium transition-colors duration-200 xl:px-3',
                active === section.id
                  ? monolithOnDarkHero
                    ? 'text-white underline underline-offset-8'
                    : variant === 'monolith'
                      ? tokens.navMonolithActive
                      : tokens.navActive
                  : monolithOnDarkHero
                    ? 'text-white/65 hover:text-white'
                    : tokens.navInactive,
                variant === 'monolith' && 'rounded-none text-xs uppercase tracking-[0.12em]'
              )}
            >
              {variant === 'monolith' ? `${String(index + 1).padStart(2, '0')}` : section.heading}
            </button>
          ))}
        </nav>

        <div className="@lg:ml-0 ml-auto flex items-center gap-0.5">
          <ShowcaseThemeToggle
            hidden={configControlled}
            className={monolithOnDarkHero ? 'hover:bg-white/10' : undefined}
          />
          <button
            type="button"
            className={cn(
              'flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg',
              !forceMobile && '@lg:hidden',
              monolithOnDarkHero ? 'hover:bg-white/10' : tokens.themeToggleHover,
              variant === 'monolith' && 'rounded-none'
            )}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute inset-x-0 top-full border-b shadow-lg',
              !forceMobile && '@lg:hidden',
              tokens.headerSheet
            )}
          >
            <nav
              className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3"
              aria-label="Showcase sections"
            >
              {navSections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => goTo(section.id)}
                  className={cn(
                    'flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-left text-base font-medium transition-colors duration-200',
                    active === section.id
                      ? tokens.menuItemActive
                      : variant === 'monolith'
                        ? tokens.menuItemMonolith
                        : tokens.menuItemInactive,
                    variant === 'monolith' && 'rounded-none'
                  )}
                >
                  <span>{section.heading}</span>
                  {variant === 'monolith' ? (
                    <span className="text-xs tracking-wider opacity-50">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function DeepLinkScroll({ enabled }: { enabled: boolean }) {
  const { scrollToAnchor } = useSmoothScroll();
  useEffect(() => {
    if (!enabled) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const t = window.setTimeout(() => scrollToAnchor(hash), 120);
    return () => window.clearTimeout(t);
  }, [enabled, scrollToAnchor]);
  return null;
}

function ShowcaseShellInner({
  data,
  containedChrome,
  children,
}: {
  data: ShowcaseData;
  containedChrome: boolean;
  children: ReactNode;
}) {
  const { tokens } = useShowcaseTheme();
  const { displayFontClass, headingScaleClass, bodyScaleClass } = useShowcaseStyle();
  const smooth = !data.embed && !data.reducedMotion && data.config.motion.intensity !== 'subtle';

  return (
    <SmoothScrollProvider enabled={smooth}>
      <div
        className={cn(
          'showcase-scope @container relative isolate w-full min-w-0',
          displayFontClass,
          headingScaleClass,
          bodyScaleClass,
          resolveShowcaseWarmTintClass(data.config.palette.mode),
          data.embed
            ? 'h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-y-contain'
            : 'min-h-[100dvh]',
          tokens.page
        )}
        data-showcase-scroll-root={data.embed ? '' : undefined}
        style={{
          ['--primary' as string]: showcasePrimaryCssVar(data.accentColor),
          ['--showcase-accent' as string]: showcasePrimaryCssVar(data.accentColor),
        }}
      >
        <ShowcaseNav data={data} containedChrome={containedChrome} />
        <DeepLinkScroll enabled={!data.embed && !containedChrome} />
        <main>{children}</main>
        <ShowcaseFooter data={data} />
      </div>
    </SmoothScrollProvider>
  );
}

function ShowcaseShellBody({
  data,
  variant,
  children,
}: {
  data: ShowcaseData;
  variant: 'aurora' | 'monolith' | 'editorial';
  children: ReactNode;
}) {
  const containedChrome = useShowcaseContainedChrome(data.embed);
  const configControlled = useShowcaseConfigControlled();

  return (
    <ShowcaseThemeProvider
      variant={variant}
      propertySlug={data.propertySlug}
      config={data.config}
      configControlled={configControlled}
    >
      <ShowcaseStyleProvider config={data.config}>
        <ShowcaseShellInner data={data} containedChrome={containedChrome}>
          {children}
        </ShowcaseShellInner>
      </ShowcaseStyleProvider>
    </ShowcaseThemeProvider>
  );
}

export function ShowcaseShell({
  data,
  variant,
  children,
}: {
  data: ShowcaseData;
  variant: 'aurora' | 'monolith' | 'editorial';
  children: ReactNode;
  className?: string;
}) {
  usePageTitle(`${data.propertyName} - Showcase`);
  useFavicon(data.logoUrl ?? undefined);

  return (
    <ShowcaseShellBody data={data} variant={variant}>
      {children}
    </ShowcaseShellBody>
  );
}
