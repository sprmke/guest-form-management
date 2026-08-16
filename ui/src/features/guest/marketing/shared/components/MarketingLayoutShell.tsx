import { useEffect } from 'react';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { scrollToSection } from '@/features/guest/marketing/for-hosts/lib/scrollToSection';
import { MarketingFooter } from '@/features/guest/marketing/shared/components/MarketingFooter';
import { MarketingNav } from '@/features/guest/marketing/shared/components/MarketingNav';
import { ListingScrollSearchProvider } from '@/features/guest/marketing/shared/context/ListingScrollSearchContext';
import { getListingScrollSearchConfig } from '@/features/guest/marketing/shared/lib/listingScrollSearchPaths';
import { getListingSearchDefaultLocation } from '@/features/guest/marketing/shared/lib/listingSearchDefaultLocation';
import {
  getListingSearchFields,
  getListingSearchWhereSegment,
} from '@/features/guest/marketing/shared/lib/listingSearchFields';

import { useFavicon } from '@/lib/favicon';
import { APP_TITLE, usePageTitle } from '@/lib/pageTitle';

function isPublicFormRoute(pathname: string) {
  return pathname.includes('/forms/');
}

export function MarketingLayoutShell() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const isFormPage = isPublicFormRoute(pathname);
  const scrollSearchConfig = getListingScrollSearchConfig(pathname);
  const defaultLocation = getListingSearchDefaultLocation(pathname);
  const fields = getListingSearchFields(pathname);
  const whereSegment = getListingSearchWhereSegment(pathname);

  useEffect(() => {
    if (pathname === '/for-hosts' && hash === '#pricing') {
      navigate('/for-hosts/pricing', { replace: true });
      return;
    }
    if (!hash) return;
    const id = hash.replace(/^#/, '');
    if (!id) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cancelled = false;
    let attempts = 0;
    const tryScroll = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        scrollToSection(id, reduceMotion);
        return;
      }
      attempts += 1;
      if (attempts < 20) {
        window.setTimeout(tryScroll, 50);
      }
    };

    const frame = window.requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [pathname, hash, navigate]);

  usePageTitle(APP_TITLE);
  useFavicon(undefined);

  const shell = (
    <div className="relative flex min-h-screen flex-col">
      {!isFormPage && <MarketingNav />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isFormPage && <MarketingFooter />}
    </div>
  );

  if (!scrollSearchConfig || isFormPage) {
    return shell;
  }

  return (
    <ListingScrollSearchProvider
      enabled
      redirectTo={scrollSearchConfig.redirectTo}
      preferType={scrollSearchConfig.preferType}
      defaultLocation={defaultLocation}
      fields={fields}
      whereLabel={whereSegment.label}
      wherePlaceholder={whereSegment.placeholder}
      whereCompactPlaceholder={whereSegment.compactPlaceholder}
    >
      {shell}
    </ListingScrollSearchProvider>
  );
}
