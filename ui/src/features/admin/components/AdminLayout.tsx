import React, { useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  HardHat,
  Wrench,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamLogoMark } from '@/components/TeamLogoMark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { GmailReconnectProvider } from '@/features/admin/components/GmailReconnectProvider';
import { useAppSettings } from '@/features/admin/hooks/useAppSettings';
import { useAdminSession } from '@/features/admin/hooks/useAdminSession';

type NavItem = {
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Manage',
    items: [
      { label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard },
      { label: 'Bookings', href: '/bookings', Icon: BookOpen },
      { label: 'Finance', href: '/finance', Icon: DollarSign },
      { label: 'Maintenance', href: '/maintenance', Icon: Wrench },
      { label: 'Marketing', href: '/marketing', Icon: Megaphone },
      { label: 'Staff', href: '/staff', Icon: HardHat },
      { label: 'Operations', href: '/operations', Icon: Bell },
      { label: 'Settings', href: '/settings', Icon: Settings },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = 'kame-admin-sidebar-collapsed';

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
}

type Props = {
  children: ReactNode;
};

export function AdminLayout({ children }: Props) {
  const location = useLocation();
  const { email, name, signOut } = useAdminSession();
  const { data: appSettings } = useAppSettings();
  const teamLogoUrl = appSettings?.emailLogoUrl;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(readSidebarCollapsed);
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

  const SidebarContent = ({
    onClose,
    collapsed = false,
    showCollapseToggle = false,
    menuOpen,
  }: {
    onClose?: () => void;
    collapsed?: boolean;
    showCollapseToggle?: boolean;
    /** When false (mobile drawer closed), collapse the account menu. */
    menuOpen?: boolean;
  }) => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          'flex relative items-center h-16 border-b shrink-0 border-separator',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <Link
          to="/dashboard"
          className={cn(
            'flex items-center gap-3',
            collapsed && 'justify-center',
          )}
          onClick={onClose}
          title={collapsed ? 'Kame Home Admin' : undefined}
        >
          <TeamLogoMark src={teamLogoUrl} />
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-base font-bold tracking-tight text-foreground">
                Kame Home
              </span>
              <span className="block text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Admin
              </span>
            </div>
          )}
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl transition-colors text-muted-foreground hover:bg-muted/70 hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        ) : showCollapseToggle ? (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground',
              collapsed &&
                'absolute -right-3.5 top-5 border border-border/50 bg-card shadow-elevated',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <nav
        className={cn(
          'overflow-y-auto flex-1 py-4',
          collapsed ? 'px-2' : 'px-3',
        )}
        aria-label="Main menu"
      >
        <div className="space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="space-y-1">
                {section.items.map(({ label, href, Icon }) => {
                  const active =
                    location.pathname === href ||
                    location.pathname.startsWith(href + '/');

                  return (
                    <Link
                      key={href}
                      to={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? label : undefined}
                      className={cn(
                        'group flex items-center rounded-xl text-sm font-semibold transition-all duration-200',
                        collapsed
                          ? 'justify-center px-2 py-2'
                          : 'gap-2.5 px-2.5 py-2',
                        active
                          ? 'nav-item-active'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                          active
                            ? 'nav-item-active-icon'
                            : 'bg-muted/80 group-hover:bg-primary/10',
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                      </div>
                      {!collapsed && (
                        <span className="flex-1 truncate">{label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

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

  return (
    <GmailReconnectProvider>
    <div className="min-h-screen app-shell">
      {/* Desktop — floating sidebar */}
      <aside
        className={cn(
          'fixed left-3 top-3 z-30 hidden h-[calc(100vh-1.5rem)] rounded-xl border border-border bg-card shadow-elevated-lg transition-all duration-300 sm:left-4 sm:top-4 sm:h-[calc(100vh-2rem)] lg:block',
          sidebarCollapsed ? 'w-[5.5rem]' : 'w-[17rem]',
        )}
        aria-label="Admin navigation"
        aria-expanded={!sidebarCollapsed}
      >
        <SidebarContent collapsed={sidebarCollapsed} showCollapseToggle />
      </aside>

      {/* Mobile drawer — slide + backdrop fade (panel stays mounted for exit animation) */}
      <div className="lg:hidden" aria-hidden={!mobileMenuOpen}>
        <div
          className={cn(
            'fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 ease-out bg-background/80 motion-reduce:transition-none',
            mobileMenuOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none',
          )}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden={!mobileMenuOpen}
        />
        <aside
          ref={mobileDrawerRef}
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[17rem] rounded-r-xl border border-border bg-card shadow-elevated-lg transition-transform duration-300 ease-out motion-reduce:transition-none',
            mobileMenuOpen
              ? 'translate-x-0'
              : 'pointer-events-none -translate-x-full',
          )}
          aria-label="Admin navigation"
          aria-hidden={!mobileMenuOpen}
        >
          <SidebarContent
            menuOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        </aside>
      </div>

      {/* Main — offset: sidebar inset (left-4) + width + gap */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[margin] duration-300',
          sidebarCollapsed
            ? 'lg:ml-[calc(1rem+5.5rem+0.5rem)]'
            : 'lg:ml-[calc(1rem+17rem+0.5rem)]',
        )}
      >
        <header className="flex sticky top-0 z-20 gap-3 justify-between items-center px-3 h-14 border-b shrink-0 border-separator bg-background sm:px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-4 lg:py-5 xl:px-6">
          <div className="mx-auto max-w-[1680px]">
            <div className="space-y-3 sm:space-y-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
    </GmailReconnectProvider>
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
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
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
      navigate('/sign-in', { replace: true });
    } catch (err) {
      console.error('[AdminProfileFooter] signOut failed', err);
    }
  };

  return (
    <div
      ref={profileRef}
      className={cn(
        'relative shrink-0 space-y-2 border-t border-separator',
        collapsed ? 'p-2' : 'p-3',
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
            'absolute z-50 overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevated-lg',
            collapsed
              ? 'bottom-0 left-full ml-2 w-[14rem]'
              : 'bottom-full left-3 right-3 mb-1.5',
          )}
          role="menu"
        >
          <div className="border-b border-separator bg-muted/40 px-3.5 py-2.5">
            <p className="text-ui font-semibold text-foreground">My Account</p>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              className="flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2 text-ui font-semibold text-destructive transition-colors hover:bg-destructive/10"
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
        aria-label="Account menu"
        className={cn(
          'relative z-10 flex w-full min-h-[44px] items-center rounded-xl transition-all duration-150 hover:bg-muted/70',
          collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
          profileOpen && 'bg-muted/70',
        )}
      >
        <div className="gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-primary-foreground">
          {initial}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold capitalize leading-tight text-foreground">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                {email}
              </p>
            </div>
            <ChevronLeft
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                profileOpen ? 'rotate-90' : '-rotate-90',
              )}
              aria-hidden
            />
          </>
        )}
      </button>
    </div>
  );
}
