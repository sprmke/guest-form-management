import { useMemo, useState } from 'react';

import { LifeBuoy, Loader2 } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminSupportCardGrid } from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminSupportCardGrid';
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
    <div className="surface-card flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <LifeBuoy className="text-muted-foreground size-10" aria-hidden />
      <p className="text-foreground text-sm font-medium">
        {filtered ? 'No tickets match your filters' : 'No tickets yet'}
      </p>
    </div>
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
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">Could not load support tickets.</p>
      ) : (
        <>
          <AdminPageHeader
            title="Support tickets"
            subtitle="Host bug reports, suggestions, and inquiries."
          />

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
