import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';

import { useAdminLayoutIsFillMain } from '@/features/dashboard/bookings/components/AdminLayout';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { NotificationBell } from '@/features/dashboard/notifications/components/NotificationBell';
import { SidebarTenantScope } from '@/features/dashboard/org/components/TenantSwitchers';
import { SuperAdminSidebarScope } from '@/features/dashboard/super-admin/components/SuperAdminSidebarScope';

import { useAdminMobileHeroContext } from '@/components/mobile/AdminMobileHeroContext';
import { MobilePageStack } from '@/components/mobile/FloatingPanel';
import { MobileStickyChrome } from '@/components/mobile/MobileStickyChrome';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { useMobileHeroCollapseProgress } from '@/hooks/useMobileHeroCollapseProgress';
import { useMobileStickyChrome } from '@/hooks/useMobileStickyChrome';
import { cn } from '@/lib/utils';

type MobileBrandHeroProps = {
  /** Page title shown on the teal hero band (mobile only). */
  title: string;
  subtitle?: string;
  titleId?: string;
  /** Optional icon actions — top-right, aligned with the tenant switcher row. */
  trailing?: ReactNode;
  /** When true, render super-admin scope readout instead of tenant switcher. */
  superAdmin?: boolean;
  /** Scroll sentinel for sticky chrome on pages without a float overlap. */
  pinSentinelRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  /**
   * 0 = expanded, 1 = title/arc fully compressed (parallax).
   * Driven by {@link useMobileHeroCollapseProgress} from the page scrollport.
   */
  collapseProgress?: number;
};

/**
 * Brand-colored top band — phone/tablet only (`max-lg`).
 * Scrolls with the page (not sticky). Title + arc compress via scroll parallax.
 * Desktop renders nothing (`lg:hidden`).
 */
export const MobileBrandHero = forwardRef<HTMLElement, MobileBrandHeroProps>(
  function MobileBrandHero(
    {
      title,
      subtitle,
      titleId,
      trailing,
      superAdmin = false,
      pinSentinelRef,
      className,
      collapseProgress = 0,
    },
    ref
  ) {
    const p = collapseProgress;
    const titleOpen = 1 - p;

    const titleStyle: CSSProperties = {
      maxHeight: `${Math.round(titleOpen * 72)}px`,
      opacity: titleOpen,
      transform: `translate3d(0, ${(-p * 14).toFixed(2)}px, 0)`,
      marginTop: `${(titleOpen * 0.75).toFixed(2)}rem`,
    };

    const chromeStyle: CSSProperties = {
      transform: `translate3d(0, ${(p * -1).toFixed(2)}px, 0)`,
      paddingBottom: `${(0.25 + p * 0.15).toFixed(2)}rem`,
    };

    return (
      <header
        ref={ref}
        className={cn(
          'mobile-brand-hero relative z-0 lg:hidden',
          p > 0.02 && 'mobile-brand-hero--compact',
          className
        )}
        style={{ ['--hero-collapse' as string]: String(p) } as CSSProperties}
        data-collapsed={p > 0.85 ? 'true' : 'false'}
      >
        <div
          ref={pinSentinelRef}
          className="relative z-[1] flex items-center justify-between gap-2 px-1 pb-1"
          style={chromeStyle}
        >
          <div className="min-w-0 flex-1">
            {superAdmin ? (
              <SuperAdminSidebarScope collapsed={false} variant="onPrimary" />
            ) : (
              <SidebarTenantScope collapsed={false} variant="onPrimary" />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {trailing}
            {!superAdmin ? <NotificationBell onPrimary /> : null}
          </div>
        </div>

        <div
          className="relative z-[1] overflow-hidden px-1"
          style={titleStyle}
          aria-hidden={p > 0.85}
        >
          <h1 id={titleId} className="text-primary-foreground text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-primary-foreground/75 mt-0.5 line-clamp-2 hidden text-sm lg:block">
              {subtitle}
            </p>
          ) : null}
        </div>
      </header>
    );
  }
);

type MobileHeroOverlapProps = {
  children: ReactNode;
  className?: string;
  /** Top-edge sentinel for sticky pin detection. */
  pinSentinelRef?: RefObject<HTMLDivElement | null>;
  /** Hide in-flow float while the fixed sticky bar is shown. */
  pinned?: boolean;
};

/** Floating toolbar rests on top of the hero arc (higher z than the hero). */
export function MobileHeroOverlap({
  children,
  className,
  pinSentinelRef,
  pinned = false,
}: MobileHeroOverlapProps) {
  return (
    <div
      className={cn(
        /* Must be a sibling above the hero in paint order — not inside a z-0 canvas. */
        'relative z-20 lg:hidden',
        'max-lg:-mt-5 max-lg:mb-3 max-lg:px-3.5 sm:max-lg:px-4 md:max-lg:px-6',
        className
      )}
    >
      <div
        ref={pinSentinelRef}
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-px"
      />
      <div
        aria-hidden
        className="bg-primary/30 pointer-events-none absolute inset-x-6 -top-2 h-7 rounded-full blur-md sm:inset-x-8"
      />
      <div
        className={cn(
          'relative',
          pinned && 'pointer-events-none invisible',
          'max-lg:[&>*]:shadow-native-float max-lg:[&>*]:rounded-[1.35rem]',
          'max-lg:[&>*]:ring-1 max-lg:[&>*]:ring-black/[0.04]'
        )}
        aria-hidden={pinned}
      >
        {children}
      </div>
    </div>
  );
}

type AdminMobilePageProps = {
  title: string;
  subtitle?: string;
  titleId?: string;
  heroTrailing?: ReactNode;
  overlap?: ReactNode;
  /** Compact sticky row — defaults to overlap when omitted. */
  stickyPrimary?: ReactNode;
  /** Secondary sticky controls — enables More sheet while pinned. */
  stickyMore?: ReactNode;
  stickyMoreActiveCount?: number;
  stickyMoreAriaLabel?: string;
  desktopActions?: ReactNode;
  desktopActionsClassName?: string;
  superAdmin?: boolean;
  dense?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Native mobile page shell — document scroll + morphing sticky chrome (`max-lg`).
 *
 * Mobile: hero → optional float (on top of arc) → full-bleed white canvas.
 * Default pages: `main` scrolls. Fill-main pages (Settings / Notifications / Inbox /
 * Templates): this shell is a flex column so `AdminSectionNavLayout`'s inner
 * `data-admin-content-scroll` can scroll under the hero.
 * Sticky: float/hero chrome morphs into a fixed brand bar when pinned.
 * Desktop: standard AdminPageHeader + stack.
 */
export function AdminMobilePage({
  title,
  subtitle,
  titleId,
  heroTrailing,
  overlap,
  stickyPrimary,
  stickyMore,
  stickyMoreActiveCount,
  stickyMoreAriaLabel,
  desktopActions,
  desktopActionsClassName,
  superAdmin = false,
  dense = false,
  className,
  children,
}: AdminMobilePageProps) {
  const heroContext = useAdminMobileHeroContext();
  const isMobileLayout = useIsBelowLg();
  const fillMain = useAdminLayoutIsFillMain();
  const heroRef = useRef<HTMLElement | null>(null);
  const floatSentinelRef = useRef<HTMLDivElement | null>(null);
  const heroSentinelRef = useRef<HTMLDivElement | null>(null);
  const pinSentinelRef = overlap ? floatSentinelRef : heroSentinelRef;
  const collapseProgress = useMobileHeroCollapseProgress(heroRef, isMobileLayout);
  const { pinned } = useMobileStickyChrome(pinSentinelRef, isMobileLayout);

  const resolvedStickyPrimary = stickyPrimary ?? (stickyMore ? undefined : overlap);

  /* Flush shell gutters so the hero is edge-to-edge. Do not call useAdminLayoutFillMain here —
   * section/inbox pages opt in themselves; we only preserve the flex chain when they do. */
  useLayoutEffect(() => {
    heroContext?.setHeroOwned(true);
    return () => heroContext?.setHeroOwned(false);
  }, [heroContext]);

  return (
    <div
      data-admin-mobile-page
      className={cn(
        'w-full',
        /* Participate in fillMain flex chain (Settings/Notifications/Inbox) without
         * forcing nested scroll on normal document-scroll pages. */
        'flex min-h-0 flex-1 flex-col'
      )}
    >
      <MobileBrandHero
        ref={heroRef}
        title={title}
        subtitle={subtitle}
        titleId={titleId}
        trailing={heroTrailing}
        superAdmin={superAdmin}
        pinSentinelRef={overlap ? undefined : heroSentinelRef}
        collapseProgress={collapseProgress}
        className="shrink-0"
      />

      {isMobileLayout ? (
        <MobileStickyChrome
          pinned={pinned}
          superAdmin={superAdmin}
          trailing={heroTrailing}
          primary={resolvedStickyPrimary}
          more={stickyMore}
          moreActiveCount={stickyMoreActiveCount}
          moreAriaLabel={stickyMoreAriaLabel}
        />
      ) : null}

      {/* Float is a sibling of the hero (not inside the canvas) so it paints on top of the arc. */}
      {isMobileLayout && overlap ? (
        <MobileHeroOverlap pinSentinelRef={floatSentinelRef} pinned={pinned}>
          {overlap}
        </MobileHeroOverlap>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          isMobileLayout &&
            cn(
              'bg-background relative z-0 w-full max-lg:pb-1',
              /*
               * Document-scroll no-float: mild tuck under the arc.
               * Fill-main (Settings/Notifications): never tuck — negative margin
               * pulls the inner scrollport under the hero and clips content.
               */
              !overlap && !fillMain && '-mt-6'
            )
        )}
      >
        <MobilePageStack
          dense={dense}
          className={cn(
            'min-h-0 flex-1',
            isMobileLayout &&
              cn('px-3.5 sm:px-4 md:px-6', overlap ? 'pt-1' : fillMain ? 'pt-3' : 'pt-5'),
            'max-lg:mt-0',
            className
          )}
        >
          <div className="hidden shrink-0 lg:block">
            <AdminPageHeader
              id={titleId}
              variant="compact"
              card={false}
              title={title}
              subtitle={subtitle}
              actions={desktopActions}
              actionsClassName={desktopActionsClassName}
            />
          </div>
          {children}
        </MobilePageStack>
      </div>
    </div>
  );
}
