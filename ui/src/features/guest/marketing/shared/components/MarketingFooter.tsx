import { type MouseEvent } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from 'lucide-react';

import { getAppModeFromPath } from '@/features/guest/auth/config/mode-switch';
import { useModeSwitchTransition } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';
import { marketingGuestNavLinks } from '@/features/guest/marketing/shared/lib/marketingGuestNavLinks';

const footerLinks = {
  explore: marketingGuestNavLinks,
  company: [
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
  ],
  hosts: [
    { href: '/for-hosts', label: 'Become a Host', switchesToHost: true },
    { href: '/for-hosts/pricing', label: 'Pricing' },
    { href: '/support', label: 'Support' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/cookies', label: 'Cookie Policy' },
  ],
};

const socialLinks = [
  { href: 'https://facebook.com', icon: Facebook, label: 'Facebook' },
  { href: 'https://instagram.com', icon: Instagram, label: 'Instagram' },
  { href: 'https://twitter.com', icon: Twitter, label: 'Twitter' },
];

const linkClassName = 'text-muted-foreground hover:text-foreground text-sm transition-colors';

export function MarketingFooter() {
  const { pathname } = useLocation();
  const mode = getAppModeFromPath(pathname);
  const { switchMode, isTransitioning } = useModeSwitchTransition();

  const handleExploreHome = (event: MouseEvent<HTMLAnchorElement>) => {
    if (mode === 'guest') return;
    event.preventDefault();
    switchMode('guest');
  };

  const handleBecomeHost = (event: MouseEvent<HTMLAnchorElement>) => {
    if (mode === 'host') return;
    event.preventDefault();
    switchMode('host');
  };

  return (
    <footer className="bg-muted text-foreground border-border border-t">
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6 lg:gap-12">
          <div className="col-span-2">
            <Link
              to="/"
              onClick={handleExploreHome}
              className="mb-6 flex items-center gap-2"
              aria-disabled={isTransitioning}
            >
              <div className="from-primary to-primary/80 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br">
                <span className="text-xl font-bold text-white">K</span>
              </div>
              <span className="text-xl font-bold tracking-tight">
                Kame<span className="text-primary">Homes</span>
              </span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Discover amazing vacation rentals across the Philippines. Book your perfect getaway
              with confidence.
            </p>
            <div className="text-muted-foreground space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="text-primary h-4 w-4 shrink-0" aria-hidden />
                <span>Manila, Philippines</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="text-primary h-4 w-4 shrink-0" aria-hidden />
                <a href="mailto:hello@kamehomes.com" className={linkClassName}>
                  hello@kamehomes.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="text-primary h-4 w-4 shrink-0" aria-hidden />
                <a href="tel:+639123456789" className={linkClassName}>
                  +63 912 345 6789
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Explore</h4>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">For Hosts</h4>
            <ul className="space-y-3">
              {footerLinks.hosts.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className={linkClassName}
                    onClick={'switchesToHost' in link ? handleBecomeHost : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-border border-t">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Kame Homes. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
