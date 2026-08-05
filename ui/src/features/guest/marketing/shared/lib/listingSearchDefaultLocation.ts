import { useMemo } from 'react';

import { useLocation } from 'react-router-dom';

import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';
import { findCityByLocationSlug } from '@/features/guest/marketing/developments/lib/groupDevelopmentsByLocation';
import { findCityByLocationSlug as findParkingCityByLocationSlug } from '@/features/guest/marketing/parkings/lib/groupParkingsByLocation';
import { buildParkingListEntries } from '@/features/guest/marketing/parkings/lib/parkingListEntries';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';
import { findPlaceByLocationSlug } from '@/features/guest/marketing/properties/lib/groupPropertiesByLocation';

/**
 * Route-aware default for the hero search "Where" field.
 *
 * Category indexes (`/developments`, `/properties`, …) stay empty — the page
 * already scopes the catalog; stuffing the category label into Where looks like
 * a failed search ("No matches" for "Developments").
 *
 * Detail / location browse paths prefill a real place or listing name.
 */
export function getListingSearchDefaultLocation(pathname: string): string {
  // Category indexes — never invent a Where value from the nav label.
  if (
    pathname === '/developments' ||
    pathname === '/properties' ||
    pathname === '/parkings' ||
    pathname === '/services' ||
    pathname === '/search'
  ) {
    return '';
  }

  const developmentsInMatch = pathname.match(/^\/developments\/in\/([^/]+)$/);
  if (developmentsInMatch) {
    return findCityByLocationSlug(developmentsInMatch[1] ?? '', mockDevelopments) ?? '';
  }

  const developmentDetailMatch = pathname.match(/^\/developments\/([^/]+)$/);
  if (developmentDetailMatch) {
    const slug = developmentDetailMatch[1] ?? '';
    if (slug !== 'in') {
      const development = mockDevelopments.find((d) => d.slug === slug);
      return development?.name ?? '';
    }
  }

  const developmentPropertiesMatch = pathname.match(/^\/developments\/([^/]+)\/properties$/);
  if (developmentPropertiesMatch) {
    const slug = developmentPropertiesMatch[1] ?? '';
    const development = mockDevelopments.find((d) => d.slug === slug);
    return development?.name ?? '';
  }

  const developmentParkingMatch = pathname.match(/^\/developments\/([^/]+)\/parking/);
  if (developmentParkingMatch) {
    const slug = developmentParkingMatch[1] ?? '';
    const development = mockDevelopments.find((d) => d.slug === slug);
    return development?.name ?? '';
  }

  const propertiesInMatch = pathname.match(/^\/properties\/in\/([^/]+)$/);
  if (propertiesInMatch) {
    return findPlaceByLocationSlug(propertiesInMatch[1] ?? '', mockProperties) ?? '';
  }

  const parkingsInMatch = pathname.match(/^\/parkings\/in\/([^/]+)$/);
  if (parkingsInMatch) {
    return findParkingCityByLocationSlug(parkingsInMatch[1] ?? '', buildParkingListEntries()) ?? '';
  }

  return '';
}

export function useListingSearchDefaultLocation(): string {
  const { pathname } = useLocation();
  return useMemo(() => getListingSearchDefaultLocation(pathname), [pathname]);
}
