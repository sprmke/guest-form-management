export type ListingScrollSearchConfig = {
  redirectTo: string;
};

/** Exact listing roots that morph the hero search into the sticky nav. */
const LISTING_SEARCH_PATHS: Record<string, ListingScrollSearchConfig> = {
  '/properties': { redirectTo: '/properties' },
  '/developments': { redirectTo: '/developments' },
  '/parkings': { redirectTo: '/parkings' },
};

/**
 * Location browse pages (`/properties/in/:location`, `/developments/in/:location`)
 * use the same hero → header search morph as their parent list pages.
 */
function locationBrowseConfig(pathname: string): ListingScrollSearchConfig | null {
  if (pathname.startsWith('/properties/in/')) {
    return { redirectTo: '/properties' };
  }
  if (pathname.startsWith('/developments/in/')) {
    return { redirectTo: '/developments' };
  }
  if (pathname.startsWith('/parkings/in/')) {
    return { redirectTo: '/parkings' };
  }
  return null;
}

function developmentDetailConfig(pathname: string): ListingScrollSearchConfig | null {
  const match = pathname.match(/^\/developments\/([^/]+)$/);
  if (!match?.[1] || match[1] === 'in') return null;
  return { redirectTo: '/developments' };
}

function developmentPropertiesConfig(pathname: string): ListingScrollSearchConfig | null {
  const match = pathname.match(/^\/developments\/([^/]+)\/properties$/);
  if (!match?.[1] || match[1] === 'in') return null;
  return { redirectTo: '/developments' };
}

export function getListingScrollSearchConfig(pathname: string): ListingScrollSearchConfig | null {
  return (
    LISTING_SEARCH_PATHS[pathname] ??
    locationBrowseConfig(pathname) ??
    developmentDetailConfig(pathname) ??
    developmentPropertiesConfig(pathname)
  );
}
