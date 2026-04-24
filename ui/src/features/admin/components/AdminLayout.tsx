import React, { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/features/admin/hooks/useAdminSession";

type NavItem = {
  label: string;
  href: string | null;
  Icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  soon?: boolean;
};

type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Manage",
    items: [{ label: "Bookings", href: "/bookings", Icon: BookOpen }],
  },
  {
    label: "Configure",
    items: [
      { label: "Reports", href: null, Icon: LayoutDashboard, soon: true },
      { label: "Settings", href: null, Icon: Settings, soon: true },
    ],
  },
];

type Props = {
  title: string;
  breadcrumb?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Shared shell: fixed sidebar on lg+ with profile dropdown, sticky topbar.
 * Design mirrors property-management-app: white sidebar, teal-green primary,
 * Plus Jakarta Sans, rounded-xl nav pills, h-16 topbar with frosted glass.
 */
export function AdminLayout({ title, breadcrumb, actions, children }: Props) {
  const location = useLocation();
  const { email, signOut } = useAdminSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const displayName = email?.split("@")[0] ?? "Admin";
  const initial = displayName[0]?.toUpperCase() ?? "A";

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand / Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link
          to="/bookings"
          className="flex items-center gap-3"
          onClick={onClose}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary shadow-sm shrink-0">
            <span className="text-sidebar-primary-foreground text-[14px] font-black">
              K
            </span>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-sidebar-foreground">
            Kame Home
          </span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main menu">
        <div className="space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
                {section.label}
              </p>
              <div className="space-y-1.5">
                {section.items.map(({ label, href, Icon, soon }) => {
                  const active =
                    href !== null &&
                    (location.pathname === href ||
                      location.pathname.startsWith(href + "/"));

                  if (href === null) {
                    return (
                      <div
                        key={label}
                        className="group flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 opacity-50"
                      >
                        <Icon className="h-5 w-5 shrink-0 text-sidebar-muted" />
                        <span className="flex-1 truncate text-sm font-medium text-sidebar-muted">
                          {label}
                        </span>
                        {soon && (
                          <span className="rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-sidebar-muted border border-sidebar-border">
                            Soon
                          </span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={href}
                      to={href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          active
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-muted group-hover:text-sidebar-accent-foreground",
                        )}
                      />
                      <span className="flex-1 truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Profile / User area */}
      <div
        ref={onClose ? undefined : profileRef}
        className="relative shrink-0 border-t border-sidebar-border p-3"
      >
        {/* Dropdown panel — opens above the button */}
        {profileOpen && !onClose && (
          <div
            className="absolute bottom-full left-3 right-3 mb-1.5 overflow-hidden rounded-xl bg-white"
            style={{
              border: "1px solid hsl(220 13% 91%)",
              boxShadow:
                "0 -4px 24px rgba(0,0,0,0.1), 0 -1px 6px rgba(0,0,0,0.05)",
            }}
          >
            {/* Identity */}
            <div className="px-3.5 py-3 bg-sidebar-accent/50 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-black shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-sidebar-foreground leading-tight truncate capitalize">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-sidebar-muted truncate leading-tight mt-0.5">
                    {email}
                  </p>
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => {
                  void signOut();
                  setProfileOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          type="button"
          onClick={() => !onClose && setProfileOpen((o) => !o)}
          aria-haspopup={!onClose ? "true" : undefined}
          aria-expanded={!onClose ? profileOpen : undefined}
          aria-label="Account menu"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-150",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            profileOpen && !onClose && "bg-sidebar-accent",
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-black shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] font-semibold text-sidebar-foreground leading-none truncate capitalize">
              {displayName}
            </p>
            <p className="text-[10px] text-sidebar-muted mt-[3px] leading-none truncate">
              {email}
            </p>
          </div>
          {!onClose && (
            <ChevronLeft
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-sidebar-muted transition-transform duration-200",
                profileOpen ? "rotate-90" : "-rotate-90",
              )}
              aria-hidden
            />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Fixed sidebar (desktop) ─────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-30 w-[260px] hidden lg:block"
        aria-label="Admin navigation"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden shadow-hard">
            <SidebarContent onClose={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      {/* ── Content area (offset on lg+) ─────────────────────── */}
      <div className="lg:pl-[260px] min-h-screen flex flex-col">
        {/* Topbar */}
        <header
          className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b px-4 md:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          style={{ borderColor: "hsl(220 13% 91%)" }}
        >
          {/* Left: hamburger (mobile) + breadcrumb (desktop) + title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop breadcrumb */}
            <nav
              className="hidden lg:flex items-center gap-1.5 text-[13px] min-w-0"
              aria-label="Breadcrumb"
            >
              <span className="font-medium text-sidebar-muted">Admin</span>
              <ChevronRight
                className="h-3.5 w-3.5 text-sidebar-muted shrink-0"
                aria-hidden
              />
              {breadcrumb && (
                <>
                  <span className="font-medium text-sidebar-muted">
                    {breadcrumb}
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-sidebar-muted shrink-0"
                    aria-hidden
                  />
                </>
              )}
              <h1 className="text-[13px] font-semibold text-sidebar-foreground truncate">
                {title}
              </h1>
            </nav>

            {/* Mobile title */}
            <h1 className="lg:hidden text-[14px] font-bold text-sidebar-foreground truncate">
              {title}
            </h1>
          </div>

          {/* Right: injected page actions + mobile sign-out */}
          <div className="flex items-center gap-1.5 shrink-0">
            {actions}
            <button
              type="button"
              onClick={() => void signOut()}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[hsl(210_20%_98%)]">
          {children}
        </main>
      </div>
    </>
  );
}
