import type { Development } from '@/features/dashboard/super-admin/types/development';
import {
  developmentTypeLabel,
  developmentStatusLabel,
} from '@/features/dashboard/super-admin/lib/developmentSettingsConstants';

export type SuperAdminDevelopmentsFilters = {
  search: string;
  status: 'all' | 'ACTIVE' | 'INACTIVE';
  type: string;
};

import type { SuperAdminListViewMode } from '@/features/dashboard/super-admin/lib/superAdminListViewMode';

export type SuperAdminDevelopmentsViewMode = SuperAdminListViewMode;

export function filterSuperAdminDevelopments(
  developments: Development[],
  filters: SuperAdminDevelopmentsFilters
): Development[] {
  const search = filters.search.trim().toLowerCase();
  return developments.filter((development) => {
    if (filters.status !== 'all' && development.status !== filters.status) return false;
    if (filters.type !== 'all' && development.type !== filters.type) return false;
    if (!search) return true;
    const haystack = [
      development.name,
      development.developerName,
      development.city,
      development.location,
      developmentTypeLabel(development.type),
      developmentStatusLabel(development.status),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function superAdminDevelopmentsHasActiveFilters(
  filters: SuperAdminDevelopmentsFilters
): boolean {
  return filters.search.trim() !== '' || filters.status !== 'all' || filters.type !== 'all';
}

export type SuperAdminDevelopmentCardModel = {
  title: string;
  subtitle: string | null;
  typeLabel: string;
  locationLine: string;
  thumbnailUrl: string | null;
  propertyCount: number;
  parkingCount: number;
};

export function superAdminDevelopmentCardModel(
  development: Development
): SuperAdminDevelopmentCardModel {
  const settings = development.settings ?? {};
  const images = Array.isArray(settings.images)
    ? settings.images.filter((item): item is string => typeof item === 'string')
    : [];
  const thumbnailUrl = development.coverImageUrl ?? images[0] ?? null;
  const city = development.city?.trim() ?? '';
  const location = development.location?.trim() ?? '';
  const locationLine = [city, location].filter(Boolean).join(' · ') || '—';

  return {
    title: development.name,
    subtitle: development.developerName,
    typeLabel: developmentTypeLabel(development.type),
    locationLine,
    thumbnailUrl,
    propertyCount: development.stats.propertyCount,
    parkingCount: development.stats.parkingCount,
  };
}

export function superAdminDevelopmentsSummaryFromList(developments: Development[]) {
  const total = developments.length;
  const active = developments.filter((entry) => entry.status === 'ACTIVE').length;
  const linkedProperties = developments.reduce((sum, entry) => sum + entry.stats.propertyCount, 0);
  const linkedParking = developments.reduce((sum, entry) => sum + entry.stats.parkingCount, 0);
  return { total, active, linkedProperties, linkedParking };
}
