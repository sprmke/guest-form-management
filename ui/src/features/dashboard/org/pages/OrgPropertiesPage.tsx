import { useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { Loader2, Plus } from 'lucide-react';

import { AdminMetricCardSkeleton } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { AddPropertyDialog } from '@/features/dashboard/org/components/AddPropertyDialog';
import { OrgPropertiesSummaryCards } from '@/features/dashboard/org/components/org-properties/OrgPropertiesSummaryCards';
import {
  OrgPropertiesResultsMeta,
  OrgPropertiesToolbar,
} from '@/features/dashboard/org/components/org-properties/OrgPropertiesToolbar';
import {
  OrgPropertiesEmptyState,
  OrgPropertyCard,
  OrgPropertyListRow,
} from '@/features/dashboard/org/components/org-properties/OrgPropertyCard';
import { useOrganizations, useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import {
  filterOrgProperties,
  orgPropertiesHasActiveFilters,
  type OrgPropertiesFilters,
  type OrgPropertiesViewMode,
} from '@/features/dashboard/org/lib/orgPropertiesFilters';
import {
  propertySectionPath,
  setLastTenantContext,
} from '@/features/dashboard/org/lib/tenantPaths';
import { useOrgPermissions } from '@/features/dashboard/team/hooks/useOrgPermissions';
import { hasOrgPermission } from '@/features/dashboard/team/lib/orgPermissions';

import { Button } from '@/components/ui/button';

export function OrgPropertiesPage() {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: orgsData, isLoading: orgsLoading } = useOrganizations();
  const { data: propsData, isLoading: propsLoading } = useProperties(orgSlug);
  const { data: orgAccess } = useOrgPermissions();
  const canCreateProperties = hasOrgPermission(orgAccess?.permissions, 'org:properties:create');

  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<OrgPropertiesViewMode>('grid');
  const [filters, setFilters] = useState<OrgPropertiesFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });

  const org = orgsData?.organizations.find((entry) => entry.slug === orgSlug);
  const properties = propsData?.properties ?? [];

  const filteredProperties = useMemo(
    () => filterOrgProperties(properties, filters),
    [properties, filters]
  );

  const hasActiveFilters = orgPropertiesHasActiveFilters(filters);
  const isLoading = orgsLoading || propsLoading;

  return (
    <RequireAdmin>
      
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-muted/60 h-14 animate-pulse rounded-xl" />
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <AdminMetricCardSkeleton key={index} />
              ))}
            </div>
            <div className="flex justify-center py-12">
              <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
            </div>
          </div>
        ) : !org ? (
          <p className="text-muted-foreground text-sm">Organization not found.</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <AdminPageHeader
              title="Properties"
              subtitle="Manage all properties in your organization."
              actions={
                canCreateProperties ? (
                  <Button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="min-h-[44px] gap-1.5"
                  >
                    <Plus className="size-4" aria-hidden />
                    Add property
                  </Button>
                ) : undefined
              }
            />

            <OrgPropertiesSummaryCards properties={properties} />

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
                    <OrgPropertyCard key={property.id} property={property} orgSlug={org.slug} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProperties.map((property) => (
                    <OrgPropertyListRow key={property.id} property={property} orgSlug={org.slug} />
                  ))}
                </div>
              )
            ) : (
              <OrgPropertiesEmptyState
                filtered={hasActiveFilters}
                canAdd={canCreateProperties}
                onAdd={() => setAddOpen(true)}
              />
            )}

            <OrgPropertiesResultsMeta
              visibleCount={filteredProperties.length}
              totalCount={properties.length}
            />
          </div>
        )}

        {org ? (
          <AddPropertyDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            orgId={org.id}
            orgSlug={org.slug}
            orgName={org.name}
            onCreated={(property) => {
              setLastTenantContext(org.slug, property.slug);
              navigate(propertySectionPath(org.slug, property.slug, 'settings'));
            }}
          />
        ) : null}
      
    </RequireAdmin>
  );
}
