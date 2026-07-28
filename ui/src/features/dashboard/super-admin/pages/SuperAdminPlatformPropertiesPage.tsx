import { useMemo, useState } from 'react';

import { Loader2 } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import {
  OrgPropertiesEmptyState,
  OrgPropertyCard,
} from '@/features/dashboard/org/components/org-properties/OrgPropertyCard';
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

  const filteredPlatformProperties = useMemo(
    () => filterSuperAdminPlatformProperties(platformProperties, filters),
    [platformProperties, filters]
  );

  const hasActiveFilters = superAdminPlatformPropertiesHasActiveFilters(filters);

  return (
    <div className="space-y-3 sm:space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">Could not load properties.</p>
      ) : (
        <>
          <AdminPageHeader title="Properties" />

          <SuperAdminPlatformPropertiesToolbar
            filters={filters}
            viewMode={viewMode}
            onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
            onStatusChange={(status) => setFilters((current) => ({ ...current, status }))}
            onTypeChange={(type) => setFilters((current) => ({ ...current, type }))}
            onDevelopmentChange={(development) =>
              setFilters((current) => ({ ...current, development }))
            }
            onViewModeChange={setViewMode}
          />

          {filteredPlatformProperties.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPlatformProperties.map((property) => (
                  <OrgPropertyCard key={property.id} {...platformPropertyCardProps(property)} />
                ))}
              </div>
            ) : (
              <SuperAdminPlatformPropertiesTable properties={filteredPlatformProperties} />
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
