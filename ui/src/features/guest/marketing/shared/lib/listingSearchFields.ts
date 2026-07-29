import { useMemo } from 'react';

import { useLocation } from 'react-router-dom';

import {
  HERO_SEARCH_FIELDS,
  type HeroSearchField,
} from '@/features/guest/marketing/guest-landing/components/HeroSearch';

export type ListingSearchWhereSegment = {
  label: string;
  placeholder: string;
  compactPlaceholder: string;
};

const DEFAULT_WHERE_SEGMENT: ListingSearchWhereSegment = {
  label: 'Where',
  placeholder: 'Search destinations',
  compactPlaceholder: 'Anywhere',
};

const SERVICES_WHERE_SEGMENT: ListingSearchWhereSegment = {
  label: 'What',
  placeholder: 'Search services',
  compactPlaceholder: 'Services',
};

/** Route-aware visible search segments (e.g. parking and services omit Who). */
export function getListingSearchFields(pathname: string): HeroSearchField[] {
  if (pathname === '/services') {
    return ['where', 'when'];
  }
  if (pathname.match(/^\/developments\/([^/]+)\/parking/)) {
    return ['where', 'when'];
  }
  if (pathname === '/parkings' || pathname.startsWith('/parkings/in/')) {
    return ['where', 'when'];
  }
  return [...HERO_SEARCH_FIELDS];
}

export function getListingSearchWhereSegment(pathname: string): ListingSearchWhereSegment {
  if (pathname === '/services') {
    return SERVICES_WHERE_SEGMENT;
  }
  return DEFAULT_WHERE_SEGMENT;
}

export function useListingSearchFields(): HeroSearchField[] {
  const { pathname } = useLocation();
  return useMemo(() => getListingSearchFields(pathname), [pathname]);
}

export function useListingSearchWhereSegment(): ListingSearchWhereSegment {
  const { pathname } = useLocation();
  return useMemo(() => getListingSearchWhereSegment(pathname), [pathname]);
}
