import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Loader2, Plus } from 'lucide-react';

import { AdminMetricCardSkeleton } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { AddDevelopmentDialog } from '@/features/dashboard/super-admin/components/super-admin-developments/AddDevelopmentDialog';
import {
  SuperAdminDevelopmentCard,
  SuperAdminDevelopmentsEmptyState,
} from '@/features/dashboard/super-admin/components/super-admin-developments/SuperAdminDevelopmentCard';
import { SuperAdminDevelopmentsSummaryCards } from '@/features/dashboard/super-admin/components/super-admin-developments/SuperAdminDevelopmentsSummaryCards';
import { SuperAdminDevelopmentsTable } from '@/features/dashboard/super-admin/components/super-admin-developments/SuperAdminDevelopmentsTable';
import {
  SuperAdminDevelopmentsResultsMeta,
  SuperAdminDevelopmentsToolbar,
} from '@/features/dashboard/super-admin/components/super-admin-developments/SuperAdminDevelopmentsToolbar';
import { useDevelopments } from '@/features/dashboard/super-admin/hooks/useDevelopments';
import {
  filterSuperAdminDevelopments,
  superAdminDevelopmentsHasActiveFilters,
  type SuperAdminDevelopmentsFilters,
  type SuperAdminDevelopmentsViewMode,
} from '@/features/dashboard/super-admin/lib/superAdminDevelopmentsFilters';
import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';

import { Button } from '@/components/ui/button';

export function SuperAdminDevelopmentsPage() {
  const navigate = useNavigate();
  const { data: developments = [], isLoading, error } = useDevelopments();
  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<SuperAdminDevelopmentsViewMode>('table');
  const [filters, setFilters] = useState<SuperAdminDevelopmentsFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });

  const filteredDevelopments = useMemo(
    () => filterSuperAdminDevelopments(developments, filters),
    [developments, filters]
  );

  const hasActiveFilters = superAdminDevelopmentsHasActiveFilters(filters);

  return (
    <div className="space-y-3 sm:space-y-4">
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
      ) : error ? (
        <p className="text-destructive text-sm">Could not load developments.</p>
      ) : (
        <>
          <AdminPageHeader
            title="Developments"
            actions={
              <Button
                type="button"
                onClick={() => setAddOpen(true)}
                className="min-h-[44px] gap-1.5"
              >
                <Plus className="size-4" aria-hidden />
                Add development
              </Button>
            }
          />

          <SuperAdminDevelopmentsSummaryCards developments={developments} />

          <SuperAdminDevelopmentsToolbar
            filters={filters}
            viewMode={viewMode}
            onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
            onStatusChange={(status) => setFilters((current) => ({ ...current, status }))}
            onTypeChange={(type) => setFilters((current) => ({ ...current, type }))}
            onViewModeChange={setViewMode}
          />

          {filteredDevelopments.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {filteredDevelopments.map((development) => (
                  <SuperAdminDevelopmentCard key={development.id} development={development} />
                ))}
              </div>
            ) : (
              <SuperAdminDevelopmentsTable developments={filteredDevelopments} />
            )
          ) : (
            <SuperAdminDevelopmentsEmptyState
              filtered={hasActiveFilters}
              onAdd={() => setAddOpen(true)}
            />
          )}

          <SuperAdminDevelopmentsResultsMeta
            visibleCount={filteredDevelopments.length}
            totalCount={developments.length}
          />
        </>
      )}

      <AddDevelopmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(slug) => navigate(superAdminPaths.developmentDetail(slug))}
      />
    </div>
  );
}
