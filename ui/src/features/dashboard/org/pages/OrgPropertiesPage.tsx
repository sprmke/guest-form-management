import { useMemo, useState, useEffect } from 'react';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CopyPlus, Plus } from 'lucide-react';

import { AdminMetricCardSkeleton } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { AddPropertyDialog } from '@/features/dashboard/org/components/AddPropertyDialog';
import {
  CopyPropertySettingsDialog,
  type CopyPropertySettingsDialogProperty,
} from '@/features/dashboard/org/components/org-properties/CopyPropertySettingsDialog';
import { CopyPropertySettingsHistory } from '@/features/dashboard/org/components/org-properties/CopyPropertySettingsHistory';
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

import { FloatingToolbar } from '@/components/mobile/FloatingPanel';
import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import {
  MobileHeroActionMenu,
  type MobileHeroActionMenuItem,
} from '@/components/mobile/MobileHeroActionButton';
import { ListingCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';

export function OrgPropertiesPage() {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: orgsData, isLoading: orgsLoading } = useOrganizations();
  const { data: propsData, isLoading: propsLoading } = useProperties(orgSlug);
  const { data: orgAccess } = useOrgPermissions();
  const canCreateProperties = hasOrgPermission(orgAccess?.permissions, 'org:properties:create');

  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourcePropertyId, setCopySourcePropertyId] = useState<string | null>(null);
  const [copyLockedTargetId, setCopyLockedTargetId] = useState<string | null>(null);
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
  const canCopySettings = properties.length >= 2;

  const copyDialogProperties = useMemo<CopyPropertySettingsDialogProperty[]>(
    () =>
      properties.map((property) => ({
        id: property.id,
        name: property.name,
        tower: property.tower,
        unitNumber: property.unitNumber,
        status: property.status,
      })),
    [properties]
  );

  const propertyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of properties) {
      map.set(property.id, property.name);
    }
    return map;
  }, [properties]);

  const openCopySettings = (sourcePropertyId?: string | null, lockedTargetId?: string | null) => {
    setCopySourcePropertyId(sourcePropertyId ?? null);
    setCopyLockedTargetId(lockedTargetId ?? null);
    setCopyOpen(true);
  };

  useEffect(() => {
    const copyTarget = searchParams.get('copyTarget')?.trim();
    if (!copyTarget || properties.length < 2) return;
    if (!properties.some((p) => p.id === copyTarget)) return;
    openCopySettings(null, copyTarget);
    const next = new URLSearchParams(searchParams);
    next.delete('copyTarget');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from query
  }, [properties, searchParams]);

  const heroMenuItems = useMemo(() => {
    const items: MobileHeroActionMenuItem[] = [];
    if (canCopySettings) {
      items.push({
        key: 'copy-settings',
        label: 'Copy settings',
        Icon: CopyPlus,
        onSelect: () => openCopySettings(properties[0]?.id ?? null),
      });
    }
    if (canCreateProperties) {
      items.push({
        key: 'add-property',
        label: 'Add property',
        Icon: Plus,
        onSelect: () => setAddOpen(true),
      });
    }
    return items;
  }, [canCopySettings, canCreateProperties, properties]);

  const heroTrailing =
    heroMenuItems.length > 0 ? (
      <MobileHeroActionMenu items={heroMenuItems} label="Property actions" />
    ) : undefined;

  const desktopActions =
    canCreateProperties || canCopySettings ? (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {canCopySettings ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => openCopySettings(properties[0]?.id ?? null)}
            className="min-h-[44px] gap-1.5"
          >
            <CopyPlus className="size-4" aria-hidden />
            Copy settings
          </Button>
        ) : null}
        {canCreateProperties ? (
          <Button type="button" onClick={() => setAddOpen(true)} className="min-h-[44px] gap-1.5">
            <Plus className="size-4" aria-hidden />
            Add property
          </Button>
        ) : null}
      </div>
    ) : undefined;

  return (
    <RequireAdmin>
      <AdminMobilePage
        title="Properties"
        subtitle="All properties in your organization."
        titleId="org-properties-heading"
        heroTrailing={heroTrailing}
        desktopActions={desktopActions}
      >
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <AdminMetricCardSkeleton key={index} />
              ))}
            </div>
            <ListingCardGridSkeleton count={8} label="Loading properties" />
          </div>
        ) : !org ? (
          <p className="text-muted-foreground text-sm">Organization not found.</p>
        ) : (
          <>
            <OrgPropertiesSummaryCards properties={properties} />

            <FloatingToolbar>
              <OrgPropertiesToolbar
                filters={filters}
                viewMode={viewMode}
                onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
                onStatusChange={(status) => setFilters((current) => ({ ...current, status }))}
                onTypeChange={(type) => setFilters((current) => ({ ...current, type }))}
                onViewModeChange={setViewMode}
              />
            </FloatingToolbar>

            {filteredProperties.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredProperties.map((property) => (
                    <OrgPropertyCard
                      key={property.id}
                      property={property}
                      orgSlug={org.slug}
                      onCopySettings={canCopySettings ? openCopySettings : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProperties.map((property) => (
                    <OrgPropertyListRow
                      key={property.id}
                      property={property}
                      orgSlug={org.slug}
                      onCopySettings={canCopySettings ? openCopySettings : undefined}
                    />
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

            <CopyPropertySettingsHistory orgSlug={org.slug} propertyNameById={propertyNameById} />
          </>
        )}
      </AdminMobilePage>

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

      {org && canCopySettings ? (
        <CopyPropertySettingsDialog
          open={copyOpen}
          onOpenChange={(open) => {
            setCopyOpen(open);
            if (!open) setCopyLockedTargetId(null);
          }}
          orgSlug={org.slug}
          properties={copyDialogProperties}
          initialSourcePropertyId={copySourcePropertyId}
          lockedTargetPropertyId={copyLockedTargetId}
        />
      ) : null}
    </RequireAdmin>
  );
}
