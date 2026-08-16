import { orgPropertiesHasActiveFilters } from '@/features/dashboard/org/lib/orgPropertiesFilters';
import type { OrgPropertiesFilters } from '@/features/dashboard/org/lib/orgPropertiesFilters';
import type { SuperAdminListViewMode } from '@/features/dashboard/super-admin/lib/superAdminListViewMode';
import type { PlatformProperty } from '@/features/dashboard/super-admin/types/platformProperty';

export type SuperAdminPlatformPropertiesViewMode = SuperAdminListViewMode;

export type PlatformPropertiesDevelopmentFilter = 'all' | 'linked' | 'unlinked';

export type SuperAdminPlatformPropertiesFilters = OrgPropertiesFilters & {
  development: PlatformPropertiesDevelopmentFilter;
};

export function platformPropertySearchHaystack(property: PlatformProperty): string {
  return [
    property.name,
    property.slug,
    property.organizationName,
    property.organizationSlug,
    property.developmentName,
    property.residenceName,
    property.address,
    property.type,
    property.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterSuperAdminPlatformProperties(
  properties: PlatformProperty[],
  filters: SuperAdminPlatformPropertiesFilters
): PlatformProperty[] {
  const query = filters.search.trim().toLowerCase();

  return properties.filter((property) => {
    const matchesSearch = !query || platformPropertySearchHaystack(property).includes(query);
    const matchesStatus = filters.status === 'all' || property.status === filters.status;
    const matchesType =
      filters.type === 'all' ||
      property.type.trim().toUpperCase() === filters.type.trim().toUpperCase();
    const matchesDevelopment =
      filters.development === 'all' ||
      (filters.development === 'linked'
        ? Boolean(property.developmentSlug)
        : !property.developmentSlug);

    return matchesSearch && matchesStatus && matchesType && matchesDevelopment;
  });
}

export function superAdminPlatformPropertiesHasActiveFilters(
  filters: SuperAdminPlatformPropertiesFilters
): boolean {
  return orgPropertiesHasActiveFilters(filters) || filters.development !== 'all';
}
