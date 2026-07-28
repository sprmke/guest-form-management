import { useMemo } from 'react';

import { useLocation } from 'react-router-dom';

import {
  HERO_SEARCH_FIELDS,
  type HeroSearchField,
} from '@/features/guest/marketing/guest-landing/components/HeroSearch';

/** Route-aware visible search segments (e.g. parking omits Who). */
export function getListingSearchFields(pathname: string): HeroSearchField[] {
  if (pathname.match(/^\/developments\/([^/]+)\/parking/)) {
    return ['where', 'when'];
  }
  if (pathname === '/parkings' || pathname.startsWith('/parkings/in/')) {
    return ['where', 'when'];
  }
  return [...HERO_SEARCH_FIELDS];
}

export function useListingSearchFields(): HeroSearchField[] {
  const { pathname } = useLocation();
  return useMemo(() => getListingSearchFields(pathname), [pathname]);
}
