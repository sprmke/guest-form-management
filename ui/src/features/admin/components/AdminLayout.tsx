import React, { useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  HardHat,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
      { label: 'Bookings', href: '/bookings', Icon: BookOpen },
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    setProfileOpen(false);
  };

  const SidebarContent = ({
    onClose,
    collapsed = false,
    showCollapseToggle = false,
  }: {
    onClose?: () => void;
    collapsed?: boolean;
    showCollapseToggle?: boolean;
  }) => (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'relative flex h-16 shrink-0 items-center border-b border-border/50',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <Link
          to="/bookings"
          className={cn(
            'flex items-center gap-3',
            collapsed && 'justify-center',
          )}
          onClick={onClose}
          title={collapsed ? 'Kame Home Admin' : undefined}
        >
          <div className="gradient-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-soft">
            <span className="text-[14px] font-black text-primary-foreground">
              K
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-base font-bold tracking-tight text-foreground">
                Kame Home
              </span>
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </span>
            </div>
          )}
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
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
          'flex-1 overflow-y-auto py-4',
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
                        'group flex items-center rounded-2xl text-sm font-semibold transition-all duration-200',
                        collapsed
                          ? 'justify-center px-2 py-2.5'
                          : 'gap-3 px-3 py-2.5',
                        active
                          ? 'nav-item-active'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                          active
                            ? 'nav-item-active-icon'
                            : 'bg-muted/80 group-hover:bg-primary/10',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
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

      <div
        ref={onClose ? undefined : profileRef}
        className={cn(
          'relative shrink-0 space-y-2 border-t border-border/50',
          collapsed ? 'p-2' : 'p-3',
        )}
      >
        {!onClose && (
          <div className={cn(collapsed ? 'flex justify-center px-0' : 'px-1')}>
            <ThemeToggle
              variant={collapsed ? 'icon' : 'segmented'}
              className={collapsed ? undefined : 'w-full'}
            />
          </div>
        )}

        {profileOpen && !onClose && (
          <div
            className={cn(
              'absolute z-50 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-elevated-lg',
              collapsed
                ? 'bottom-0 left-full ml-2 w-[14rem]'
                : 'bottom-full left-3 right-3 mb-1.5',
            )}
          >
            <div className="border-b border-border/50 bg-muted/40 px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-primary-foreground">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-ui font-bold capitalize leading-tight text-foreground">
                    {displayName}
                  </p>
                  <p className="mt-0.5 truncate text-caption leading-tight">
                    {email}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => {
                  void signOut();
                  setProfileOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-ui font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => !onClose && setProfileOpen((o) => !o)}
          aria-haspopup={!onClose ? 'true' : undefined}
          aria-expanded={!onClose ? profileOpen : undefined}
          aria-label="Account menu"
          className={cn(
            'flex w-full items-center rounded-2xl transition-all duration-150 hover:bg-muted/70',
            collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
            profileOpen && !onClose && 'bg-muted/70',
          )}
        >
          <div className="gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-primary-foreground">
            {initial}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-ui font-semibold capitalize leading-none text-foreground">
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-caption leading-none">
                  {email}
                </p>
              </div>
              {!onClose && (
                <ChevronLeft
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                    profileOpen ? 'rotate-90' : '-rotate-90',
                  )}
                  aria-hidden
                />
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell min-h-screen">
      {/* Desktop — floating sidebar */}
      <aside
        className={cn(
          'fixed left-3 top-3 z-30 hidden h-[calc(100vh-1.5rem)] rounded-[1.75rem] border border-border/50 bg-card/95 shadow-elevated-lg backdrop-blur-xl transition-all duration-300 sm:left-4 sm:top-4 sm:h-[calc(100vh-2rem)] lg:block',
          sidebarCollapsed ? 'w-[5.5rem]' : 'w-[17rem]',
        )}
        aria-label="Admin navigation"
        aria-expanded={!sidebarCollapsed}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          showCollapseToggle
        />
      </aside>

      {/* Mobile drawer — slide + backdrop fade (panel stays mounted for exit animation) */}
      <div className="lg:hidden" aria-hidden={!mobileMenuOpen}>
        <div
          className={cn(
            'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none',
            mobileMenuOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden={!mobileMenuOpen}
        />
        <aside
          ref={mobileDrawerRef}
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[17rem] rounded-r-[1.75rem] border border-border/50 bg-card shadow-elevated-lg transition-transform duration-300 ease-out motion-reduce:transition-none',
            mobileMenuOpen
              ? 'translate-x-0'
              : 'pointer-events-none -translate-x-full',
          )}
          aria-label="Admin navigation"
          aria-hidden={!mobileMenuOpen}
        >
          <SidebarContent onClose={() => setMobileMenuOpen(false)} />
        </aside>
      </div>

      {/* Main — offset for floating sidebar; no desktop topbar (fixes spacing) */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[margin] duration-300',
          sidebarCollapsed
            ? 'lg:ml-[calc(5.5rem+2rem)]'
            : 'lg:ml-[calc(17rem+2rem)]',
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-background/90 px-3 backdrop-blur-md sm:px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-5 xl:px-8">
          <div className="mx-auto max-w-[1680px] animate-fade-in-up">
            <div className="space-y-3 sm:space-y-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
