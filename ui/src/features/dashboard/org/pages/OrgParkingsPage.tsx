import { useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { Loader2, Plus } from 'lucide-react';

import { AdminMetricCardSkeleton } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { AddParkingDialog } from '@/features/dashboard/org/components/AddParkingDialog';
import {
  OrgParkingCard,
  OrgParkingListRow,
  OrgParkingsEmptyState,
} from '@/features/dashboard/org/components/org-parkings/OrgParkingCard';
import { OrgParkingsSummaryCards } from '@/features/dashboard/org/components/org-parkings/OrgParkingsSummaryCards';
import {
  OrgParkingsResultsMeta,
  OrgParkingsToolbar,
} from '@/features/dashboard/org/components/org-parkings/OrgParkingsToolbar';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { useParkings } from '@/features/dashboard/org/hooks/useParkings';
import {
  filterOrgParkings,
  orgParkingsHasActiveFilters,
  type OrgParkingsFilters,
  type OrgParkingsViewMode,
} from '@/features/dashboard/org/lib/orgParkingsFilters';
import {
  parkingSectionPath,
  setLastParkingContext,
} from '@/features/dashboard/org/lib/tenantPaths';
import { useOrgPermissions } from '@/features/dashboard/team/hooks/useOrgPermissions';
import { hasOrgPermission } from '@/features/dashboard/team/lib/orgPermissions';

import { Button } from '@/components/ui/button';

export function OrgParkingsPage() {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: orgsData, isLoading: orgsLoading } = useOrganizations();
  const { data: parkingsData, isLoading: parkingsLoading } = useParkings(orgSlug);
  const { data: orgAccess } = useOrgPermissions();
  const canCreateParkings = hasOrgPermission(orgAccess?.permissions, 'org:parkings:create');

  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<OrgParkingsViewMode>('grid');
  const [filters, setFilters] = useState<OrgParkingsFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });

  const org = orgsData?.organizations.find((entry) => entry.slug === orgSlug);
  const parkings = parkingsData?.parkings ?? [];

  const filteredParkings = useMemo(() => filterOrgParkings(parkings, filters), [parkings, filters]);

  const hasActiveFilters = orgParkingsHasActiveFilters(filters);
  const isLoading = orgsLoading || parkingsLoading;

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
            title="Parkings"
            subtitle="Manage all parking slots in your organization."
            actions={
              canCreateParkings ? (
                <Button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="min-h-[44px] gap-1.5"
                >
                  <Plus className="size-4" aria-hidden />
                  Add parking
                </Button>
              ) : undefined
            }
          />

          <OrgParkingsSummaryCards parkings={parkings} />

          <OrgParkingsToolbar
            filters={filters}
            viewMode={viewMode}
            onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
            onStatusChange={(status) => setFilters((current) => ({ ...current, status }))}
            onTypeChange={(type) => setFilters((current) => ({ ...current, type }))}
            onViewModeChange={setViewMode}
          />

          {filteredParkings.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {filteredParkings.map((parking) => (
                  <OrgParkingCard key={parking.id} parking={parking} orgSlug={org.slug} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredParkings.map((parking) => (
                  <OrgParkingListRow key={parking.id} parking={parking} orgSlug={org.slug} />
                ))}
              </div>
            )
          ) : (
            <OrgParkingsEmptyState
              filtered={hasActiveFilters}
              canAdd={canCreateParkings}
              onAdd={() => setAddOpen(true)}
            />
          )}

          <OrgParkingsResultsMeta
            visibleCount={filteredParkings.length}
            totalCount={parkings.length}
          />
        </div>
      )}

      {org && orgSlug ? (
        <AddParkingDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          orgId={org.id}
          orgSlug={orgSlug}
          orgName={org.name}
          onCreated={(parking) => {
            setLastParkingContext(orgSlug, parking.slug);
            navigate(parkingSectionPath(orgSlug, parking.slug, 'settings'));
          }}
        />
      ) : null}
    </RequireAdmin>
  );
}
