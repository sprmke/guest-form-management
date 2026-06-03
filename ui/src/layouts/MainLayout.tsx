import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';
import { guestEnterClass, type GuestNavState } from '@/layouts/guestNavState';

interface MainLayoutProps {
  children?: ReactNode;
  /** Animate the content card on guest route changes (calendar → form → success). */
  animateOnNavigate?: boolean;
}

export function MainLayout({ children, animateOnNavigate = false }: MainLayoutProps) {
  const location = useLocation();
  const navState = location.state as GuestNavState | null;
  const content = children ?? <Outlet />;

  return (
    <main className="app-shell relative min-h-screen">
      {/* Theme toggle — top-right on mobile, bottom-right on larger screens */}
      <div className="pointer-events-none fixed right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-50 sm:hidden">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 hidden sm:bottom-6 sm:right-6 sm:block">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>
      {/* Hero banner */}
      <div className="relative h-[180px] w-full overflow-hidden md:h-[260px]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/images/hero-banner.png')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/45 to-primary/80" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
      </div>

      {/* Content card */}
      <div className="relative -mt-10 px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8">
        <div className="mx-auto min-w-0 max-w-3xl">
          <div
            key={
              animateOnNavigate
                ? `${location.pathname}${location.search}`
                : undefined
            }
            className={cn(
              'surface-card relative min-w-0 overflow-hidden sm:overflow-visible',
              animateOnNavigate && guestEnterClass(navState),
            )}
          >
            {content}
          </div>
        </div>
      </div>

      <footer className="px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 text-center text-xs text-muted-foreground sm:px-6">
        <p>© 2024 Kame Home — Azure North. All rights reserved.</p>
      </footer>
    </main>
  );
}
