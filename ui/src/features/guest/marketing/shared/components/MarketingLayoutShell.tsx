import { Outlet, useLocation } from 'react-router-dom';

import { MarketingFooter } from '@/features/guest/marketing/shared/components/MarketingFooter';
import { MarketingNav } from '@/features/guest/marketing/shared/components/MarketingNav';
import { ListingScrollSearchProvider } from '@/features/guest/marketing/shared/context/ListingScrollSearchContext';
import { ModeSwitchTransitionProvider } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';
import { getListingScrollSearchConfig } from '@/features/guest/marketing/shared/lib/listingScrollSearchPaths';
import { getListingSearchDefaultLocation } from '@/features/guest/marketing/shared/lib/listingSearchDefaultLocation';
import { getListingSearchFields } from '@/features/guest/marketing/shared/lib/listingSearchFields';

function isPublicFormRoute(pathname: string) {
  return pathname.includes('/forms/');
}

export function MarketingLayoutShell() {
  const { pathname } = useLocation();
  const isFormPage = isPublicFormRoute(pathname);
  const scrollSearchConfig = getListingScrollSearchConfig(pathname);
  const defaultLocation = getListingSearchDefaultLocation(pathname);
  const fields = getListingSearchFields(pathname);

  const shell = (
    <ModeSwitchTransitionProvider>
      <div className="relative flex min-h-screen flex-col">
        {!isFormPage && <MarketingNav />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!isFormPage && <MarketingFooter />}
      </div>
    </ModeSwitchTransitionProvider>
  );

  if (!scrollSearchConfig || isFormPage) {
    return shell;
  }

  return (
    <ListingScrollSearchProvider
      enabled
      redirectTo={scrollSearchConfig.redirectTo}
      defaultLocation={defaultLocation}
      fields={fields}
    >
      {shell}
    </ListingScrollSearchProvider>
  );
}
