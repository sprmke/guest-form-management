import { useMemo, useState } from 'react';

import { Loader2 } from 'lucide-react';

import { AdminMetricCardSkeleton } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import {
  SuperAdminHostCard,
  SuperAdminHostsEmptyState,
} from '@/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostCard';
import { SuperAdminHostsSummaryCards } from '@/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostsSummaryCards';
import { SuperAdminHostsTable } from '@/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostsTable';
import {
  SuperAdminHostsResultsMeta,
  SuperAdminHostsToolbar,
} from '@/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostsToolbar';
import { useHosts } from '@/features/dashboard/super-admin/hooks/useHosts';
import {
  filterSuperAdminHosts,
  superAdminHostsHasActiveFilters,
  type SuperAdminHostsFilters,
  type SuperAdminHostsViewMode,
} from '@/features/dashboard/super-admin/lib/superAdminHostsFilters';

import { useAdminMobileGridViewGuard } from '@/hooks/useAdminMobileGridViewGuard';
import { useIsBelowLg } from '@/hooks/useMediaQuery';

export function SuperAdminHostsPage() {
  const { data: hosts = [], isLoading, error } = useHosts();
  const [viewMode, setViewMode] = useState<SuperAdminHostsViewMode>('table');
  const [filters, setFilters] = useState<SuperAdminHostsFilters>({ search: '' });
  const isMobileLayout = useIsBelowLg();
  useAdminMobileGridViewGuard(isMobileLayout, viewMode, setViewMode);

  const filteredHosts = useMemo(() => filterSuperAdminHosts(hosts, filters), [hosts, filters]);
  const hasActiveFilters = superAdminHostsHasActiveFilters(filters);
  const showTableView = viewMode === 'table' && !isMobileLayout;

  return (
    <div className="space-y-3 sm:space-y-4">
      {isLoading ? (
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-muted/60 h-14 animate-pulse rounded-xl" />
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <AdminMetricCardSkeleton key={index} />
            ))}
          </div>
          <div className="flex justify-center py-12">
            <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
          </div>
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">Could not load hosts.</p>
      ) : (
        <>
          <AdminPageHeader title="Hosts" subtitle="All hosts on the platform." />

          <SuperAdminHostsSummaryCards hosts={hosts} />

          <SuperAdminHostsToolbar
            filters={filters}
            viewMode={viewMode}
            hideTableView={isMobileLayout}
            onSearchChange={(search) => setFilters({ search })}
            onViewModeChange={setViewMode}
          />

          {filteredHosts.length > 0 ? (
            showTableView ? (
              <SuperAdminHostsTable hosts={filteredHosts} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {filteredHosts.map((host) => (
                  <SuperAdminHostCard key={host.id} host={host} />
                ))}
              </div>
            )
          ) : (
            <SuperAdminHostsEmptyState filtered={hasActiveFilters} />
          )}

          <SuperAdminHostsResultsMeta
            visibleCount={filteredHosts.length}
            totalCount={hosts.length}
          />
        </>
      )}
    </div>
  );
}
