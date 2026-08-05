import { Outlet, useLocation } from 'react-router-dom';

import { MarketingFooter } from '@/features/guest/marketing/shared/components/MarketingFooter';
import { MarketingNav } from '@/features/guest/marketing/shared/components/MarketingNav';
import { ListingScrollSearchProvider } from '@/features/guest/marketing/shared/context/ListingScrollSearchContext';
import { getListingScrollSearchConfig } from '@/features/guest/marketing/shared/lib/listingScrollSearchPaths';
import { getListingSearchDefaultLocation } from '@/features/guest/marketing/shared/lib/listingSearchDefaultLocation';
import {
  getListingSearchFields,
  getListingSearchWhereSegment,
} from '@/features/guest/marketing/shared/lib/listingSearchFields';

function isPublicFormRoute(pathname: string) {
  return pathname.includes('/forms/');
}

export function MarketingLayoutShell() {
  const { pathname } = useLocation();
  const isFormPage = isPublicFormRoute(pathname);
  const scrollSearchConfig = getListingScrollSearchConfig(pathname);
  const defaultLocation = getListingSearchDefaultLocation(pathname);
  const fields = getListingSearchFields(pathname);
  const whereSegment = getListingSearchWhereSegment(pathname);

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
