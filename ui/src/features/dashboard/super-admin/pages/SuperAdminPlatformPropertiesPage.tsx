import { useMemo, useState } from 'react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import {
  OrgPropertiesEmptyState,
  OrgPropertyCard,
} from '@/features/dashboard/org/components/org-properties/OrgPropertyCard';
import { SuperAdminPlatformPropertiesSummaryCards } from '@/features/dashboard/super-admin/components/super-admin-platform-properties/SuperAdminPlatformPropertiesSummaryCards';
import { SuperAdminPlatformPropertiesTable } from '@/features/dashboard/super-admin/components/super-admin-platform-properties/SuperAdminPlatformPropertiesTable';
import {
  SuperAdminPlatformPropertiesResultsMeta,
  SuperAdminPlatformPropertiesToolbar,
} from '@/features/dashboard/super-admin/components/super-admin-platform-properties/SuperAdminPlatformPropertiesToolbar';
import { usePlatformProperties } from '@/features/dashboard/super-admin/hooks/usePlatformProperties';
import { platformPropertyToProperty } from '@/features/dashboard/super-admin/lib/platformPropertyAdapter';
import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';
import {
  filterSuperAdminPlatformProperties,
  superAdminPlatformPropertiesHasActiveFilters,
  type SuperAdminPlatformPropertiesFilters,
  type SuperAdminPlatformPropertiesViewMode,
} from '@/features/dashboard/super-admin/lib/superAdminPlatformPropertiesFilters';
import type { PlatformProperty } from '@/features/dashboard/super-admin/types/platformProperty';

import { useAdminMobileGridViewGuard } from '@/hooks/useAdminMobileGridViewGuard';
import { useIsBelowLg } from '@/hooks/useMediaQuery';

function platformPropertyCardProps(property: PlatformProperty) {
  return {
    property: platformPropertyToProperty(property),
    orgSlug: property.organizationSlug,
    hideStats: true,
    organizationName: property.organizationName,
    developmentName: property.developmentName,
    developmentHref: property.developmentSlug
      ? superAdminPaths.developmentDetail(property.developmentSlug)
      : null,
  };
}

export function SuperAdminPlatformPropertiesPage() {
  const { data: platformProperties = [], isLoading, error } = usePlatformProperties();
  const [viewMode, setViewMode] = useState<SuperAdminPlatformPropertiesViewMode>('table');
  const [filters, setFilters] = useState<SuperAdminPlatformPropertiesFilters>({
    search: '',
    status: 'all',
    type: 'all',
    development: 'all',
  });
  const isMobileLayout = useIsBelowLg();
  useAdminMobileGridViewGuard(isMobileLayout, viewMode, setViewMode);

  const filteredPlatformProperties = useMemo(
    () => filterSuperAdminPlatformProperties(platformProperties, filters),
    [platformProperties, filters]
  );

  const hasActiveFilters = superAdminPlatformPropertiesHasActiveFilters(filters);
  const showTableView = viewMode === 'table' && !isMobileLayout;

  return (
    <div className="space-y-3 sm:space-y-4">
      {isLoading ? (
        <SuperAdminPageLoading metricCount={4} />
      ) : error ? (
        <p className="text-destructive text-sm">Could not load properties.</p>
      ) : (
        <>
          <AdminPageHeader title="Properties" subtitle="All properties across the platform." />

          <SuperAdminPlatformPropertiesSummaryCards properties={platformProperties} />

          <SuperAdminPlatformPropertiesToolbar
            filters={filters}
            viewMode={viewMode}
            hideTableView={isMobileLayout}
            onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
            onStatusChange={(status) => setFilters((current) => ({ ...current, status }))}
            onTypeChange={(type) => setFilters((current) => ({ ...current, type }))}
            onDevelopmentChange={(development) =>
              setFilters((current) => ({ ...current, development }))
            }
            onViewModeChange={setViewMode}
          />

          {filteredPlatformProperties.length > 0 ? (
            showTableView ? (
              <SuperAdminPlatformPropertiesTable properties={filteredPlatformProperties} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPlatformProperties.map((property) => (
                  <OrgPropertyCard key={property.id} {...platformPropertyCardProps(property)} />
                ))}
              </div>
            )
          ) : (
            <OrgPropertiesEmptyState filtered={hasActiveFilters} canAdd={false} onAdd={() => {}} />
          )}

          <SuperAdminPlatformPropertiesResultsMeta
            visibleCount={filteredPlatformProperties.length}
            totalCount={platformProperties.length}
          />
        </>
      )}
    </div>
  );
}
