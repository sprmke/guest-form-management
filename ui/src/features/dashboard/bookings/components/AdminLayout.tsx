import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { ChevronUp, ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';

import { hostLoginPath } from '@/features/guest/auth/lib/hostAuthPaths';
import { ModeSwitcher } from '@/features/guest/marketing/shared/components/ModeSwitcher';
import { ModeSwitchTransitionProvider } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';

import {
  AdminBrandTheme,
  useAdminBrandThemeStyle,
} from '@/features/dashboard/bookings/components/AdminBrandTheme';
import { GmailReconnectProvider } from '@/features/dashboard/bookings/components/GmailReconnectProvider';
import { useAdminSession } from '@/features/dashboard/bookings/hooks/useAdminSession';
import {
  buildOrgNavSections,
  buildParkingNavSections,
  buildPropertyNavSections,
  buildSuperAdminNavSections,
  filterOrgNavSections,
  filterParkingNavSections,
  filterPropertyNavSections,
  isOrgAdminPath,
  isParkingAdminPath,
  isPropertyAdminPath,
  isSuperAdminPath,
  LEGACY_NAV_SECTIONS,
  type SidebarNavSection,
} from '@/features/dashboard/bookings/lib/adminSidebarNav';
import { resolveActiveNavHref } from '@/features/dashboard/bookings/lib/navActive';
import { OrgSettingsIssuesSync } from '@/features/dashboard/org/components/OrgSettingsIssuesSync';
import { SectionNavIssueDot } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { SidebarTenantScope } from '@/features/dashboard/org/components/TenantSwitchers';
import { GetVerifiedSidebarCta } from '@/features/dashboard/org/components/verification/GetVerifiedModal';
import { useOrganizations, useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import { useParkings } from '@/features/dashboard/org/hooks/useParkings';
import {
  hasOrgSettingsIssues,
  subscribeOrgSettingsIssues,
} from '@/features/dashboard/org/lib/orgSettingsIssuesStore';
import {
  hasPropertySettingsIssues,
  subscribePropertySettingsIssues,
} from '@/features/dashboard/org/lib/propertySettingsIssuesStore';
import { SuperAdminSidebarScope } from '@/features/dashboard/super-admin/components/SuperAdminSidebarScope';
import { superAdminOrgSlugFromPath } from '@/features/dashboard/super-admin/lib/superAdminPaths';
import { useOrgPermissions } from '@/features/dashboard/team/hooks/useOrgPermissions';
import { useParkingPermissions } from '@/features/dashboard/team/hooks/useParkingPermissions';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { SlidingActivePill } from '@/components/ui/SlidingActivePill';
import { useSlidingActivePill } from '@/hooks/useSlidingActivePill';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'kame-admin-sidebar-collapsed';

const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 72;
/** Vertical center of workspace switcher chevron (expanded) / logo (collapsed). */
const SIDEBAR_TOGGLE_TOP_EXPANDED = 42;
const SIDEBAR_TOGGLE_TOP_COLLAPSED = 32;

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
}

type Props = {
  children: ReactNode;
  /** Fill main column height (inbox-style layouts). */
  fillMain?: boolean;
};

export function AdminLayout({ children, fillMain }: Props) {
  return (
    <AdminBrandTheme>
      <AdminLayoutShell fillMain={fillMain}>{children}</AdminLayoutShell>
    </AdminBrandTheme>
  );
}

const AdminLayoutFillMainContext = createContext<((fill: boolean) => void) | null>(null);

/** Opt into full-height main column (e.g. inbox) when AdminLayout wraps the route shell. */
export function useAdminLayoutFillMain(enabled: boolean) {
  const setFillMain = useContext(AdminLayoutFillMainContext);

  useEffect(() => {
    setFillMain?.(enabled);
    return () => setFillMain?.(false);
  }, [enabled, setFillMain]);
}

/** Persistent admin chrome for React Router layout routes — keeps sidebar mounted across navigations. */
export function AdminLayoutOutlet() {
  const [fillMain, setFillMain] = useState(false);
  const setFill = useCallback((fill: boolean) => setFillMain(fill), []);

  return (
    <AdminLayoutFillMainContext.Provider value={setFill}>
      <AdminLayout fillMain={fillMain}>
        <Outlet />
      </AdminLayout>
    </AdminLayoutFillMainContext.Provider>
  );
}

function AdminLayoutShell({ children, fillMain = false }: Props) {
  const brandStyle = useAdminBrandThemeStyle();
  const location = useLocation();
  const {
    orgSlug: routeOrgSlug,
    propertySlug: routePropertySlug,
    parkingSlug: routeParkingSlug,
  } = useParams<{
    orgSlug?: string;
    propertySlug?: string;
    parkingSlug?: string;
  }>();
  const tenant = useOptionalOrgContext();
  const parkingTenant = useOptionalParkingContext();
  const { data: orgsData } = useOrganizations();
  const orgSlugForLists = tenant?.orgSlug ?? parkingTenant?.orgSlug ?? routeOrgSlug;
  const { data: propertiesData } = useProperties(orgSlugForLists);
  const { data: parkingsData } = useParkings(orgSlugForLists);
  const { email, name, signOut } = useAdminSession();
  const propertyPermissionsQuery = usePropertyPermissions();
  const parkingPermissionsQuery = useParkingPermissions();
  const orgPermissionsQuery = useOrgPermissions();

  const navSections = useMemo(() => {
    if (isSuperAdminPath(location.pathname)) {
      return buildSuperAdminNavSections(superAdminOrgSlugFromPath(location.pathname));
    }

    const orgSlug = tenant?.orgSlug ?? parkingTenant?.orgSlug ?? routeOrgSlug;
    const propertySlug = tenant?.propertySlug ?? routePropertySlug;
    const parkingSlug = parkingTenant?.parkingSlug ?? routeParkingSlug;

    if (orgSlug && propertySlug && isPropertyAdminPath(location.pathname)) {
      const sections = buildPropertyNavSections(orgSlug, propertySlug);
      if (propertyPermissionsQuery.isPending && !propertyPermissionsQuery.data) {
        return sections;
      }
      return filterPropertyNavSections(sections, propertyPermissionsQuery.data?.permissions);
    }

    if (orgSlug && parkingSlug && isParkingAdminPath(location.pathname)) {
      const sections = buildParkingNavSections(orgSlug, parkingSlug);
      if (parkingPermissionsQuery.isPending && !parkingPermissionsQuery.data) {
        return sections;
      }
      return filterParkingNavSections(sections, parkingPermissionsQuery.data?.permissions);
    }

    if (orgSlug && isOrgAdminPath(location.pathname)) {
      const org = orgsData?.organizations.find((o) => o.slug === orgSlug);
      const propertiesCount = propertiesData?.properties.length ?? 0;
      const parkingsCount = parkingsData?.parkings.length ?? 0;
      const hostModes = org?.hostModes ?? [];
      const sections = buildOrgNavSections(orgSlug, {
        showProperties: hostModes.includes('property') || propertiesCount > 0,
        showParkings: hostModes.includes('parking') || parkingsCount > 0,
      });
      if (orgPermissionsQuery.isPending && !orgPermissionsQuery.data) {
        return sections;
      }
      return filterOrgNavSections(sections, orgPermissionsQuery.data?.permissions);
    }

    if (tenant?.orgSlug && tenant?.propertySlug) {
      return buildPropertyNavSections(tenant.orgSlug, tenant.propertySlug);
    }
    if (parkingTenant?.orgSlug && parkingTenant?.parkingSlug) {
      return buildParkingNavSections(parkingTenant.orgSlug, parkingTenant.parkingSlug);
    }
    return LEGACY_NAV_SECTIONS;
  }, [
    tenant,
    parkingTenant,
    routeOrgSlug,
    routePropertySlug,
    routeParkingSlug,
    location.pathname,
    propertyPermissionsQuery.data?.permissions,
    propertyPermissionsQuery.isPending,
    parkingPermissionsQuery.data?.permissions,
    parkingPermissionsQuery.isPending,
    orgPermissionsQuery.data?.permissions,
    orgPermissionsQuery.isPending,
    orgsData?.organizations,
    propertiesData?.properties.length,
    parkingsData?.parkings.length,
  ]);

  const navHrefs = navSections.flatMap((section) =>
    section.items.flatMap((item) => (item.href ? [item.href] : []))
  );
  const navHrefsKey = navHrefs.join('\0');
  const activeNavHref = resolveActiveNavHref(location.pathname, navHrefs);
  const propertySettingsHasIssues = useSyncExternalStore(
    subscribePropertySettingsIssues,
    hasPropertySettingsIssues,
    () => false
  );
  const orgSettingsHasIssues = useSyncExternalStore(
    subscribeOrgSettingsIssues,
    hasOrgSettingsIssues,
    () => false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const mobileDrawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const drawer = mobileDrawerRef.current;
    if (!drawer) return;
    if (mobileMenuOpen) {
      drawer.removeAttribute('inert');
    } else {
      drawer.setAttribute('inert', '');
    }
  }, [mobileMenuOpen]);

  const displayName = name ?? email?.split('@')[0] ?? 'Admin';
  const initial = displayName[0]?.toUpperCase() ?? 'A';

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <GmailReconnectProvider>
      <ModeSwitchTransitionProvider>
        {isOrgAdminPath(location.pathname) ? <OrgSettingsIssuesSync /> : null}
        <div className="bg-background flex h-screen overflow-hidden" style={brandStyle}>
          {/* Mobile drawer — slide + backdrop fade (panel stays mounted for exit animation) */}
          <div className="lg:hidden" aria-hidden={!mobileMenuOpen}>
            <div
              className={cn(
                'bg-background/80 fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none',
                mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
              )}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden={!mobileMenuOpen}
            />
            <aside
              ref={mobileDrawerRef}
              className={cn(
                'border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r transition-transform duration-300 ease-out motion-reduce:transition-none',
                mobileMenuOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
              )}
              aria-label="Admin navigation"
              aria-hidden={!mobileMenuOpen}
            >
              <AdminSidebarContent
                navSections={navSections}
                activeNavHref={activeNavHref}
                navHrefsKey={navHrefsKey}
                pathname={location.pathname}
                propertySettingsHasIssues={propertySettingsHasIssues}
                orgSettingsHasIssues={orgSettingsHasIssues}
                displayName={displayName}
                initial={initial}
                email={email}
                signOut={signOut}
                menuOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                superAdmin={isSuperAdminPath(location.pathname)}
              />
            </aside>
          </div>

          <div className="relative flex min-w-0 flex-1">
            {/* Desktop sidebar */}
            <aside
              className="border-sidebar-border bg-sidebar hidden h-screen shrink-0 flex-col border-r transition-[width] duration-300 ease-out lg:flex"
              style={{ width: sidebarWidth }}
              aria-label="Admin navigation"
              aria-expanded={!sidebarCollapsed}
            >
              <AdminSidebarContent
                navSections={navSections}
                activeNavHref={activeNavHref}
                navHrefsKey={navHrefsKey}
                pathname={location.pathname}
                propertySettingsHasIssues={propertySettingsHasIssues}
                orgSettingsHasIssues={orgSettingsHasIssues}
                displayName={displayName}
                initial={initial}
                email={email}
                signOut={signOut}
                collapsed={sidebarCollapsed}
                superAdmin={isSuperAdminPath(location.pathname)}
              />
            </aside>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              style={{
                left: sidebarWidth,
                top: sidebarCollapsed ? SIDEBAR_TOGGLE_TOP_COLLAPSED : SIDEBAR_TOGGLE_TOP_EXPANDED,
              }}
              className={cn(
                'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground shadow-elevated',
                'absolute z-30 hidden min-h-[28px] min-w-[28px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-300 ease-out lg:flex',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
              )}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-3 w-3" aria-hidden />
              ) : (
                <ChevronLeft className="h-3 w-3" aria-hidden />
              )}
            </button>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {!isSuperAdminPath(location.pathname) ? (
                <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b px-4 backdrop-blur lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ThemeToggle />
                  </div>
                </header>
              ) : (
                <header className="border-border bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center border-b px-3 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </header>
              )}

              <main
                className={cn(
                  'min-h-0 flex-1',
                  fillMain ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
                )}
              >
                <div
                  className={cn(
                    'mx-auto w-full max-w-7xl p-3 sm:p-4 md:p-6 lg:p-8',
                    fillMain && 'flex min-h-0 flex-1 flex-col'
                  )}
                >
                  <div
                    className={cn(
                      fillMain
                        ? 'flex min-h-0 flex-1 flex-col'
                        : 'space-y-3 sm:space-y-4 lg:space-y-6'
                    )}
                  >
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </ModeSwitchTransitionProvider>
    </GmailReconnectProvider>
  );
}

type AdminSidebarContentProps = {
  navSections: SidebarNavSection[];
  activeNavHref: string | null;
  navHrefsKey: string;
  pathname: string;
  propertySettingsHasIssues: boolean;
  orgSettingsHasIssues: boolean;
  displayName: string;
  initial: string;
  email: string | null;
  signOut: () => Promise<void>;
  onClose?: () => void;
  collapsed?: boolean;
  /** When false (mobile drawer closed), collapse the account menu. */
  menuOpen?: boolean;
  superAdmin?: boolean;
};

/** Module-level sidebar shell — must not be defined inside AdminLayoutShell or theme changes remount the tree. */
function AdminSidebarContent({
  navSections,
  activeNavHref,
  navHrefsKey,
  pathname,
  propertySettingsHasIssues,
  orgSettingsHasIssues,
  displayName,
  initial,
  email,
  signOut,
  onClose,
  collapsed = false,
  menuOpen,
  superAdmin = false,
}: AdminSidebarContentProps) {
  const {
    containerRef,
    setItemRef,
    bounds: navPillBounds,
  } = useSlidingActivePill(activeNavHref, [collapsed, navHrefsKey]);

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'border-sidebar-border shrink-0 border-b py-3',
          collapsed ? 'flex justify-center px-2' : 'px-3',
          onClose && 'pt-3'
        )}
      >
        {onClose ? (
          <div className="mb-2 flex justify-end lg:hidden">
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:bg-muted/70 hover:text-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {superAdmin ? (
          <SuperAdminSidebarScope collapsed={collapsed} />
        ) : (
          <SidebarTenantScope collapsed={collapsed} />
        )}
      </div>

      <nav
        className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}
        aria-label="Main menu"
      >
        <div ref={containerRef} className="relative space-y-1.5">
          {navPillBounds ? (
            <SlidingActivePill bounds={navPillBounds} className="bg-primary rounded-xl shadow-sm" />
          ) : null}
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const { label, href, Icon, disabled } = item;
                  const active = href ? href === activeNavHref : false;
                  const showSettingsIssue =
                    label === 'Settings' &&
                    ((propertySettingsHasIssues && isPropertyAdminPath(pathname)) ||
                      (orgSettingsHasIssues && isOrgAdminPath(pathname)));

                  if (disabled || !href) {
                    return (
                      <div
                        key={label}
                        aria-disabled="true"
                        title={collapsed ? label : undefined}
                        className={cn(
                          'flex cursor-not-allowed items-center rounded-xl px-3 py-2.5 text-sm font-medium opacity-50',
                          collapsed ? 'justify-center px-2' : 'gap-3',
                          'text-sidebar-muted'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{label}</span>}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={href}
                      ref={setItemRef(href)}
                      to={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                      aria-label={
                        collapsed
                          ? showSettingsIssue
                            ? `${label} — items need attention`
                            : label
                          : undefined
                      }
                      className={cn(
                        'group relative z-[1] flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                        collapsed ? 'justify-center px-2' : 'gap-3',
                        active
                          ? 'text-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-muted/40'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-colors',
                          active
                            ? 'text-primary-foreground'
                            : 'text-sidebar-muted group-hover:text-foreground'
                        )}
                      />
                      {!collapsed && (
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate">{label}</span>
                          {showSettingsIssue ? <SectionNavIssueDot className="ml-auto" /> : null}
                        </span>
                      )}
                      {collapsed && showSettingsIssue ? (
                        <SectionNavIssueDot className="absolute right-1.5 top-1.5" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {!superAdmin ? <GetVerifiedSidebarCta collapsed={collapsed} /> : null}

      <AdminProfileFooter
        collapsed={collapsed}
        showThemeToggle={!onClose}
        displayName={displayName}
        initial={initial}
        email={email}
        signOut={signOut}
        menuOpen={menuOpen}
      />
    </div>
  );
}

type AdminProfileFooterProps = {
  collapsed: boolean;
  showThemeToggle: boolean;
  displayName: string;
  initial: string;
  email: string | null;
  signOut: () => Promise<void>;
  menuOpen?: boolean;
};

/**
 * Account menu at the bottom of each sidebar instance. State is per-instance
 * because desktop and mobile drawers both mount SidebarContent — a shared ref
 * would point at the hidden drawer and break outside-click / sign-out.
 */
function AdminProfileFooter({
  collapsed,
  showThemeToggle,
  displayName,
  initial,
  email,
  signOut,
  menuOpen,
}: AdminProfileFooterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname, collapsed]);

  useEffect(() => {
    if (menuOpen === false) setProfileOpen(false);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setProfileOpen(false);
    try {
      await signOut();
      navigate(hostLoginPath(), { replace: true });
    } catch (err) {
      console.error('[AdminProfileFooter] signOut failed', err);
    }
  };

  return (
    <div
      ref={profileRef}
      className={cn(
        'border-sidebar-border relative shrink-0 space-y-2 border-t',
        collapsed ? 'p-2' : 'p-3'
      )}
    >
      {showThemeToggle && (
        <div className={cn(collapsed ? 'flex justify-center px-0' : 'px-1')}>
          <ThemeToggle
            variant={collapsed ? 'icon' : 'segmented'}
            className={collapsed ? undefined : 'w-full'}
          />
        </div>
      )}

      {profileOpen && (
        <div
          className={cn(
            'border-border/50 bg-card shadow-elevated-lg absolute z-50 overflow-hidden rounded-xl border',
            collapsed
              ? 'bottom-0 left-full ml-2 w-[min(16rem,calc(100vw-1.5rem))]'
              : 'bottom-full left-3 right-3 mb-2'
          )}
          role="menu"
        >
          <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="gradient-primary text-primary-foreground ring-background flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ring-2">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-semibold capitalize leading-tight">
                {displayName}
              </p>
              {email ? (
                <p className="text-muted-foreground mt-0.5 truncate text-xs leading-tight">
                  {email}
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-border/50 border-t px-3 py-3">
            <ModeSwitcher className="w-full" />
          </div>

          <div className="border-border/50 border-t p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              className="text-ui text-destructive hover:bg-destructive/10 flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setProfileOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={profileOpen}
        aria-label={collapsed ? `Account menu, ${displayName}` : 'Account menu'}
        className={cn(
          'relative z-10 flex min-h-[44px] w-full items-center rounded-xl border transition-all duration-150',
          collapsed ? 'justify-center border-transparent px-2 py-2' : 'gap-3 px-2.5 py-2',
          profileOpen
            ? 'border-border bg-muted/60 shadow-sm'
            : 'hover:border-border/50 hover:bg-muted/40 border-transparent'
        )}
      >
        <div
          className={cn(
            'gradient-primary text-primary-foreground ring-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold shadow-sm ring-2',
            collapsed ? 'text-xs' : 'text-sm'
          )}
        >
          {initial}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-foreground truncate text-sm font-semibold capitalize leading-tight">
                {displayName}
              </p>
              {email ? (
                <p className="text-muted-foreground mt-0.5 truncate text-xs leading-tight">
                  {email}
                </p>
              ) : null}
            </div>
            <ChevronUp
              className={cn(
                'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                profileOpen && 'rotate-180'
              )}
              aria-hidden
            />
          </>
        )}
      </button>
    </div>
  );
}
