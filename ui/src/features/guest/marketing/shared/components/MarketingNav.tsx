import { useState, useEffect, type MouseEvent } from 'react';

import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { GuestAccountMenu } from '@/features/guest/account/components/GuestAccountMenu';
import {
  getLoginHrefFromPath,
  getHostMarketingNavCta,
} from '@/features/guest/auth/config/auth-navigation';
import { scrollToSection } from '@/features/guest/marketing/for-hosts/lib/scrollToSection';
import { HostAccountMenu } from '@/features/guest/marketing/shared/components/HostAccountMenu';
import {
  useListingNavMorph,
  useListingScrollSearch,
} from '@/features/guest/marketing/shared/context/ListingScrollSearchContext';
import { useModeSwitchTransition } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';

import { useAdminSession } from '@/features/dashboard/bookings/hooks/useAdminSession';

import { ThemeToggle } from '@/components/theme/MarketingThemeToggle';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const guestNavLinks = [
  { href: '/developments', label: 'Developments' },
  { href: '/properties', label: 'Properties' },
  { href: '/parkings', label: 'Parkings' },
  { href: '/services', label: 'Services' },
];

const hostNavLinks = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'reviews', label: 'Reviews' },
];

export function MarketingNav() {
  const { pathname } = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const hostLoginHref = getLoginHrefFromPath(pathname);
  const isExploreMode = hostLoginHref === null;
  const isAccountRoute = pathname.startsWith('/account');
  const { status: adminSessionStatus } = useAdminSession();
  const isHostSignedIn = adminSessionStatus === 'admin';
  const hostSignInCta = getHostMarketingNavCta(false);
  const modeSwitch = useModeSwitchTransition();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { headerAnchorRef, morph, enabled: scrollSearchEnabled } = useListingScrollSearch();
  const navMorph = useListingNavMorph();
  const headerSolid = isScrolled || morph.progress > 0.08;
  const collapseBrandForSearch = scrollSearchEnabled && morph.progress > 0.12;
  const navLinks = isExploreMode ? guestNavLinks : hostNavLinks;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const ctaButtonClassName = cn(
    'rounded-full px-6',
    !headerSolid &&
      'bg-background text-foreground hover:bg-muted dark:bg-white dark:text-black dark:hover:bg-white/90'
  );
  const hostSignInButtonClassName = cn(
    'rounded-full border-2 bg-transparent px-6 shadow-none',
    headerSolid
      ? 'border-border text-foreground hover:border-primary/30 hover:bg-accent hover:text-accent-foreground'
      : 'border-white/60 text-white hover:border-white hover:bg-white/10 hover:text-white'
  );

  const handleBecomeHost = () => {
    modeSwitch.switchMode('host');
  };

  const handleExploreMode = () => {
    modeSwitch.switchMode('guest');
  };

  const handleExploreHome = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isExploreMode) return;
    event.preventDefault();
    modeSwitch.switchMode('guest');
  };

  const handleHostNavClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setIsMobileMenuOpen(false);
    scrollToSection(id, prefersReducedMotion);
  };

  const modeCta = isExploreMode ? (
    <Button
      variant={headerSolid ? 'default' : 'secondary'}
      className={ctaButtonClassName}
      disabled={modeSwitch.isTransitioning}
      onClick={handleBecomeHost}
    >
      Become a host?
    </Button>
  ) : (
    <Button
      variant={headerSolid ? 'default' : 'secondary'}
      className={ctaButtonClassName}
      disabled={modeSwitch.isTransitioning}
      onClick={handleExploreMode}
    >
      Explore
    </Button>
  );

  const accountMenu = isExploreMode ? (
    <GuestAccountMenu />
  ) : isHostSignedIn ? (
    <HostAccountMenu />
  ) : (
    <Button variant="outline" className={hostSignInButtonClassName} asChild>
      <Link to={hostSignInCta.href}>{hostSignInCta.label}</Link>
    </Button>
  );

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
          headerSolid ? 'bg-background/80 border-b shadow-sm backdrop-blur-xl' : 'bg-transparent'
        )}
      >
        <nav className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between overflow-hidden lg:h-20">
            {/* Logo */}
            <Link
              to="/"
              onClick={handleExploreHome}
              className="group relative z-20 flex shrink-0 items-center gap-2"
            >
              <div className="from-primary to-primary/80 shadow-primary/25 group-hover:shadow-primary/40 relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-shadow">
                <span className="text-xl font-bold text-white">K</span>
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <span
                className={cn(
                  'overflow-hidden whitespace-nowrap text-xl font-bold tracking-tight transition-[max-width,opacity] duration-300 ease-out',
                  headerSolid ? 'text-foreground' : 'text-foreground dark:text-white',
                  collapseBrandForSearch
                    ? 'max-w-0 opacity-0 lg:max-w-[12rem] lg:opacity-100'
                    : 'max-w-[12rem] opacity-100'
                )}
              >
                Kame<span className="text-primary">Homes</span>
              </span>
            </Link>

            {scrollSearchEnabled ? (
              <div
                className="pointer-events-none absolute inset-y-0 left-[52px] right-12 hidden items-center lg:left-1/2 lg:flex lg:w-full lg:max-w-[24rem] lg:-translate-x-1/2"
                aria-hidden
              >
                <div ref={headerAnchorRef} className="h-10 w-full" />
              </div>
            ) : null}

            {/* Desktop Navigation */}
            {scrollSearchEnabled ? (
              <div
                className="absolute left-1/2 top-1/2 hidden items-center gap-8 will-change-transform lg:flex"
                style={{
                  opacity: navMorph.opacity,
                  transform: `translate(-50%, calc(-50% + ${navMorph.translateY}px))`,
                  pointerEvents: navMorph.progress > 0.58 ? 'none' : 'auto',
                }}
              >
                {navLinks.map((link) =>
                  'href' in link ? (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={cn(
                        'hover:text-primary text-sm font-medium transition-colors',
                        headerSolid
                          ? 'text-muted-foreground'
                          : 'text-foreground/80 hover:text-foreground dark:text-white/80 dark:hover:text-white'
                      )}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.id}
                      href={`#${link.id}`}
                      onClick={(event) => handleHostNavClick(event, link.id)}
                      className={cn(
                        'hover:text-primary text-sm font-medium transition-colors',
                        headerSolid
                          ? 'text-muted-foreground'
                          : 'text-foreground/80 hover:text-foreground dark:text-white/80 dark:hover:text-white'
                      )}
                    >
                      {link.label}
                    </a>
                  )
                )}
              </div>
            ) : (
              <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
                {navLinks.map((link) =>
                  'href' in link ? (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={cn(
                        'hover:text-primary text-sm font-medium transition-colors',
                        headerSolid
                          ? 'text-muted-foreground'
                          : 'text-foreground/80 hover:text-foreground dark:text-white/80 dark:hover:text-white'
                      )}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.id}
                      href={`#${link.id}`}
                      onClick={(event) => handleHostNavClick(event, link.id)}
                      className={cn(
                        'hover:text-primary text-sm font-medium transition-colors',
                        headerSolid
                          ? 'text-muted-foreground'
                          : 'text-foreground/80 hover:text-foreground dark:text-white/80 dark:hover:text-white'
                      )}
                    >
                      {link.label}
                    </a>
                  )
                )}
              </div>
            )}

            {/* Desktop CTA */}
            <div className="relative z-10 hidden items-center gap-4 lg:flex">
              <div
                className={cn(
                  'flex items-center justify-center',
                  !headerSolid && '[&_button]:text-foreground dark:[&_button]:text-white'
                )}
              >
                <ThemeToggle variant="ghost" size="icon" />
              </div>
              {modeCta}
              {accountMenu}
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              className={cn(
                'relative z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition-colors lg:hidden',
                headerSolid
                  ? 'text-foreground hover:bg-muted'
                  : 'text-foreground hover:bg-muted/80 dark:text-white dark:hover:bg-white/10'
              )}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 lg:hidden"
          >
            <div className="bg-background/95 border-b shadow-lg backdrop-blur-xl">
              <div className="container mx-auto space-y-4 px-4 py-6">
                {navLinks.map((link) =>
                  'href' in link ? (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-foreground hover:text-primary block min-h-[44px] py-3 text-lg font-medium transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.id}
                      href={`#${link.id}`}
                      onClick={(event) => handleHostNavClick(event, link.id)}
                      className="text-foreground hover:text-primary block min-h-[44px] py-3 text-lg font-medium transition-colors"
                    >
                      {link.label}
                    </a>
                  )
                )}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground text-sm">Theme</span>
                    <ThemeToggle variant="ghost" size="icon" />
                  </div>
                  {!isAccountRoute ? (
                    <div className="flex justify-center py-1">{accountMenu}</div>
                  ) : null}
                  <Button
                    className="w-full rounded-full"
                    disabled={modeSwitch.isTransitioning}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (isExploreMode) handleBecomeHost();
                      else handleExploreMode();
                    }}
                  >
                    {isExploreMode ? 'Become a host?' : 'Explore'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
