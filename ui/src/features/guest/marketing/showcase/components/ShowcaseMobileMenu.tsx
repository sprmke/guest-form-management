import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from 'framer-motion';
import { X } from 'lucide-react';

import { useSmoothScroll } from '@/features/guest/marketing/showcase/components/SmoothScrollProvider';
import { useShowcaseTheme } from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import { usePreviewForcesMobile } from '@/features/guest/lib/previewViewportContext';
import {
  readShowcaseScopeTheme,
  resolveShowcaseScrollRoot,
  type ShowcaseScopeThemeSnapshot,
} from '@/features/guest/marketing/showcase/lib/showcaseScroll';
import {
  SHOWCASE_MOBILE_MENU,
  type ShowcaseMobileMenuMotion,
} from '@/features/guest/marketing/showcase/lib/showcaseMobileMenuConfig';
import type { ShowcaseData } from '@/features/guest/marketing/showcase/types/showcase';

import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;
const MENU_Z = 200;

type Props = {
  open: boolean;
  onClose: () => void;
  data: ShowcaseData;
  containedChrome: boolean;
  activeSectionId: string | null;
  navSections: ShowcaseData['sections'];
};

function panelMotion(
  motionKind: ShowcaseMobileMenuMotion,
  reduced: boolean
): {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
} {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.12 },
    };
  }

  switch (motionKind) {
    case 'slide-up':
      return {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { duration: 0.36, ease: EASE },
      };
    case 'slide-down':
      return {
        initial: { y: '-100%' },
        animate: { y: 0 },
        exit: { y: '-100%' },
        transition: { duration: 0.34, ease: EASE },
      };
    case 'slide-right':
      return {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%' },
        transition: { duration: 0.34, ease: EASE },
      };
    case 'curtain':
      return {
        initial: { y: '-100%' },
        animate: { y: 0 },
        exit: { y: '-100%' },
        transition: { duration: 0.38, ease: EASE },
      };
    case 'glass-fade':
    default:
      return {
        initial: { opacity: 0.92, scale: 0.985 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0.94, scale: 0.99 },
        transition: { duration: 0.28, ease: EASE },
      };
  }
}

function panelLayout(motionKind: ShowcaseMobileMenuMotion): string {
  if (motionKind === 'slide-up') {
    return 'absolute inset-x-0 bottom-0 z-[1] max-h-[min(88dvh,100%)] min-h-[min(68dvh,100%)]';
  }
  if (motionKind === 'slide-down' || motionKind === 'curtain') {
    return 'absolute inset-0 z-[1]';
  }
  if (motionKind === 'slide-right') {
    return 'absolute inset-y-0 right-0 z-[1] ml-auto w-full max-w-sm';
  }
  return 'absolute inset-0 z-[1]';
}

const navVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035, delayChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: EASE },
  },
};

/** Portal target = visible scrollport so bottom sheets anchor to the viewport, not page bottom. */
function useMenuMountNode(
  containedChrome: boolean,
  embed: boolean
): { node: HTMLElement | null; portaled: boolean; needsPortal: boolean } {
  const needsPortal = containedChrome || embed;
  const [node, setNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!needsPortal) {
      setNode(null);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let cleanedPosition: (() => void) | null = null;

    const bind = () => {
      if (cancelled) return;
      const root = resolveShowcaseScrollRoot({ embed, containedChrome });
      if (!root) {
        rafId = requestAnimationFrame(bind);
        return;
      }

      const prevPosition = root.style.position;
      if (getComputedStyle(root).position === 'static') {
        root.style.position = 'relative';
      }
      cleanedPosition = () => {
        root.style.position = prevPosition;
      };
      setNode(root);
    };

    bind();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      cleanedPosition?.();
      setNode(null);
    };
  }, [containedChrome, embed, needsPortal]);

  return { node, portaled: Boolean(node), needsPortal };
}

/** When the menu portals outside `.showcase-scope`, re-apply palette CSS vars. */
function usePortaledShowcaseTheme(
  open: boolean,
  portaled: boolean
): ShowcaseScopeThemeSnapshot | null {
  const [theme, setTheme] = useState<ShowcaseScopeThemeSnapshot | null>(null);

  useLayoutEffect(() => {
    if (!open || !portaled) {
      setTheme(null);
      return;
    }
    setTheme(readShowcaseScopeTheme());
  }, [open, portaled]);

  return theme;
}

export function ShowcaseMobileMenu({
  open,
  onClose,
  data,
  containedChrome,
  activeSectionId,
  navSections,
}: Props) {
  const { scrollToAnchor } = useSmoothScroll();
  const { variant } = useShowcaseTheme();
  const forceMobile = usePreviewForcesMobile();
  const config = SHOWCASE_MOBILE_MENU[variant];
  const reduced = data.reducedMotion || data.embed;
  const motionProps = panelMotion(config.motion, reduced);
  const { node: mountNode, portaled, needsPortal } = useMenuMountNode(containedChrome, data.embed);
  const portaledTheme = usePortaledShowcaseTheme(open, portaled);
  /** Wait for scrollport portal before painting — otherwise absolute inset covers the
   * full page height and the panel sits off-screen after scrolling to a section. */
  const canShow = open && (!needsPortal || portaled);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /**
   * Lock vertical scroll on the real scrollport while the menu is open.
   * Important for Page Editor: do NOT set the `overflow` shorthand — that
   * overrides Tailwind `overflow-y-auto` / `overflow-x-clip` and restoring
   * `style.overflow = ''` can leave the preview frame unscrollable. Also prefer
   * the known portal mount node so we don't re-resolve while overflow is
   * already `hidden` (ancestor walk would skip the preview frame).
   */
  useEffect(() => {
    if (!open) return;
    // Wait for the portal scrollport — resolving while another lock is active
    // can pick a dashboard ancestor instead of the preview frame.
    if (needsPortal && !mountNode) return;

    const scrollRoot =
      (needsPortal ? mountNode : null) ??
      resolveShowcaseScrollRoot({
        embed: data.embed,
        containedChrome,
      });

    if (scrollRoot) {
      scrollRoot.style.removeProperty('overflow');
      scrollRoot.style.overflowY = 'hidden';
      return () => {
        scrollRoot.style.removeProperty('overflow');
        scrollRoot.style.removeProperty('overflow-y');
      };
    }

    if (!containedChrome && !data.embed) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        if (prev) document.body.style.overflow = prev;
        else document.body.style.removeProperty('overflow');
      };
    }

    return undefined;
  }, [open, needsPortal, mountNode, containedChrome, data.embed]);

  function goTo(id: string) {
    onClose();
    // Let the scroll-lock effect cleanup restore overflow-y before scrolling
    // (otherwise scrollIntoView is a no-op on a still-locked preview frame).
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToAnchor(id);
      });
    });
  }

  const positionClass = cn(
    portaled || needsPortal ? 'absolute inset-0' : 'fixed inset-0',
    !forceMobile && '@lg:hidden'
  );

  const overlay = (
    <AnimatePresence>
      {canShow ? (
        <div
          className={positionClass}
          style={{
            zIndex: MENU_Z,
            ...(portaled && portaledTheme ? portaledTheme.style : null),
          }}
          data-showcase-surface={
            portaled && portaledTheme?.surface ? portaledTheme.surface : undefined
          }
          role="dialog"
          aria-modal="true"
          aria-label="Page sections"
        >
          <motion.button
            type="button"
            aria-label="Close menu"
            className={cn('absolute inset-0 z-0 cursor-pointer', config.backdrop)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.08 : 0.22, ease: EASE }}
            onClick={onClose}
          />

          <motion.div
            className={cn(
              panelLayout(config.motion),
              config.panel,
              'flex flex-col overflow-hidden will-change-transform'
            )}
            {...motionProps}
          >
            {config.motion === 'slide-up' ? (
              <div
                className="bg-current/20 mx-auto mb-1 mt-3 h-1 w-10 shrink-0 rounded-full opacity-50"
                aria-hidden
              />
            ) : null}
            <div className={cn('flex shrink-0 items-center justify-between gap-3', config.header)}>
              <div className="min-w-0">
                <p className={cn('truncate text-xs uppercase tracking-[0.2em]', config.eyebrow)}>
                  {config.uppercase ? 'Sections' : 'Explore'}
                </p>
                <p className={cn('truncate text-base font-medium', config.title)}>
                  {data.propertyName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center',
                  config.closeButton
                )}
                aria-label="Close menu"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <motion.nav
              className="@sm:px-6 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-4 py-4"
              aria-label="Showcase sections"
              variants={reduced ? undefined : navVariants}
              initial={reduced ? false : 'hidden'}
              animate={reduced ? undefined : 'show'}
            >
              {navSections.map((section, index) => {
                const active = activeSectionId === section.id;
                return (
                  <motion.button
                    key={section.id}
                    type="button"
                    variants={reduced ? undefined : itemVariants}
                    onClick={() => goTo(section.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center text-left',
                      config.item,
                      active ? config.itemActive : config.itemIdle
                    )}
                  >
                    {config.showIndices ? (
                      <span className={config.index}>{String(index + 1).padStart(2, '0')}</span>
                    ) : null}
                    <span className="min-w-0 flex-1">{section.heading}</span>
                  </motion.button>
                );
              })}
            </motion.nav>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  if (needsPortal && mountNode) {
    return createPortal(overlay, mountNode);
  }

  if (needsPortal) {
    return null;
  }

  return overlay;
}
