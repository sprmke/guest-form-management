import { useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import {
  OrgPropertiesEmptyState,
  OrgPropertyCard,
  OrgPropertyListRow,
} from '@/features/dashboard/org/components/org-properties/OrgPropertyCard';
import {
  OrgPropertiesResultsMeta,
  OrgPropertiesToolbar,
} from '@/features/dashboard/org/components/org-properties/OrgPropertiesToolbar';
import {
  filterOrgProperties,
  orgPropertiesHasActiveFilters,
  type OrgPropertiesFilters,
  type OrgPropertiesViewMode,
} from '@/features/dashboard/org/lib/orgPropertiesFilters';
import { useHostProperties } from '@/features/dashboard/super-admin/hooks/useHosts';
import { hostPropertyToProperty } from '@/features/dashboard/super-admin/lib/hostPropertyAdapter';

export function SuperAdminHostPropertiesPage() {
  const { hostId = '' } = useParams<{ hostId: string }>();
  const { data: hostProperties = [], isLoading, error } = useHostProperties(hostId);
  const [viewMode, setViewMode] = useState<OrgPropertiesViewMode>('grid');
  const [filters, setFilters] = useState<OrgPropertiesFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });

  const properties = useMemo(() => hostProperties.map(hostPropertyToProperty), [hostProperties]);

  const orgSlugByPropertyId = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of hostProperties) {
      map.set(property.id, property.organizationSlug);
    }
    return map;
  }, [hostProperties]);

  const orgNameByPropertyId = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of hostProperties) {
      map.set(property.id, property.organizationName);
    }
    return map;
  }, [hostProperties]);

  const filteredProperties = useMemo(
    () => filterOrgProperties(properties, filters),
    [properties, filters]
  );

  const hasActiveFilters = orgPropertiesHasActiveFilters(filters);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">Could not load properties.</p>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <OrgPropertiesToolbar
        filters={filters}
        viewMode={viewMode}
        onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
        onStatusChange={(status) => setFilters((current) => ({ ...current, status }))}
        onTypeChange={(type) => setFilters((current) => ({ ...current, type }))}
        onViewModeChange={setViewMode}
      />

      {filteredProperties.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProperties.map((property) => (
              <HostPropertyGridItem
                key={property.id}
                property={property}
                orgSlug={orgSlugByPropertyId.get(property.id) ?? ''}
                orgName={orgNameByPropertyId.get(property.id) ?? ''}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProperties.map((property) => (
              <HostPropertyListItem
                key={property.id}
                property={property}
                orgSlug={orgSlugByPropertyId.get(property.id) ?? ''}
                orgName={orgNameByPropertyId.get(property.id) ?? ''}
              />
            ))}
          </div>
        )
      ) : (
        <OrgPropertiesEmptyState filtered={hasActiveFilters} canAdd={false} onAdd={() => {}} />
      )}

      <OrgPropertiesResultsMeta
        visibleCount={filteredProperties.length}
        totalCount={properties.length}
      />
    </div>
  );
}

function HostPropertyGridItem({
  property,
  orgSlug,
  orgName,
}: {
  property: ReturnType<typeof hostPropertyToProperty>;
  orgSlug: string;
  orgName: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground truncate px-0.5 text-xs">{orgName}</p>
      <OrgPropertyCard property={property} orgSlug={orgSlug} />
    </div>
  );
}

function HostPropertyListItem({
  property,
  orgSlug,
  orgName,
}: {
  property: ReturnType<typeof hostPropertyToProperty>;
  orgSlug: string;
  orgName: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground truncate px-0.5 text-xs">{orgName}</p>
      <OrgPropertyListRow property={property} orgSlug={orgSlug} />
    </div>
  );
}
