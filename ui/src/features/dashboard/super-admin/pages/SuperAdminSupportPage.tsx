import { useMemo, useState } from 'react';

import { LifeBuoy } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminEmptyState } from '@/features/dashboard/super-admin/components/shared/SuperAdminEmptyState';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import { SuperAdminSupportCardGrid } from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminSupportCardGrid';
import { SuperAdminSupportSummaryCards } from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminSupportSummaryCards';
import { SuperAdminSupportTable } from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminSupportTable';
import {
  SuperAdminSupportResultsMeta,
  SuperAdminSupportToolbar,
} from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminSupportToolbar';
import { SuperAdminTicketDetailDialog } from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminTicketDetailDialog';
import { useSupportTicketsAdmin } from '@/features/dashboard/super-admin/hooks/useSupportTicketsAdmin';
import {
  DEFAULT_SUPER_ADMIN_SUPPORT_FILTERS,
  filterSuperAdminSupportTickets,
  superAdminSupportHasActiveFilters,
  type SuperAdminSupportFilters,
  type SuperAdminSupportViewMode,
} from '@/features/dashboard/super-admin/lib/superAdminSupportFilters';

import { useAdminMobileGridViewGuard } from '@/hooks/useAdminMobileGridViewGuard';
import { useIsBelowLg } from '@/hooks/useMediaQuery';

function SupportTicketsEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <SuperAdminEmptyState
      icon={LifeBuoy}
      title={filtered ? 'No tickets match your filters' : 'No tickets yet'}
    />
  );
}

export function SuperAdminSupportPage() {
  const { data, isLoading, error } = useSupportTicketsAdmin({
    category: null,
    status: null,
    orgId: null,
  });
  const [viewMode, setViewMode] = useState<SuperAdminSupportViewMode>('table');
  const [filters, setFilters] = useState<SuperAdminSupportFilters>(
    DEFAULT_SUPER_ADMIN_SUPPORT_FILTERS
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const isMobileLayout = useIsBelowLg();
  useAdminMobileGridViewGuard(isMobileLayout, viewMode, setViewMode);

  const tickets = data?.tickets;
  const filtered = useMemo(
    () => filterSuperAdminSupportTickets(tickets ?? [], filters),
    [tickets, filters]
  );
  const hasActiveFilters = superAdminSupportHasActiveFilters(filters);
  const showTableView = viewMode === 'table' && !isMobileLayout;
  const ticketCount = tickets?.length ?? 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      {isLoading ? (
        <SuperAdminPageLoading metricCount={4} />
      ) : error ? (
        <p className="text-destructive text-sm">Could not load support tickets.</p>
      ) : (
        <>
          <AdminPageHeader
            title="Support tickets"
            subtitle="Host bug reports, suggestions, and inquiries."
          />

          <SuperAdminSupportSummaryCards tickets={tickets ?? []} />

          <SuperAdminSupportToolbar
            filters={filters}
            viewMode={viewMode}
            hideTableView={isMobileLayout}
            onSearchChange={(search) => setFilters((prev) => ({ ...prev, search }))}
            onCategoryChange={(category) => setFilters((prev) => ({ ...prev, category }))}
            onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
            onViewModeChange={setViewMode}
          />

          {filtered.length > 0 ? (
            showTableView ? (
              <SuperAdminSupportTable tickets={filtered} onSelect={setSelectedTicketId} />
            ) : (
              <SuperAdminSupportCardGrid tickets={filtered} onSelect={setSelectedTicketId} />
            )
          ) : (
            <SupportTicketsEmptyState filtered={hasActiveFilters} />
          )}

          <SuperAdminSupportResultsMeta visibleCount={filtered.length} totalCount={ticketCount} />
        </>
      )}

      <SuperAdminTicketDetailDialog
        ticketId={selectedTicketId}
        onOpenChange={(open) => {
          if (!open) setSelectedTicketId(null);
        }}
      />
    </div>
  );
}
