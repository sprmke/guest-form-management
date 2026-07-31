import { useMemo, useState } from 'react';

import { ClipboardCheck, Filter, Loader2, Search } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminApprovalReviewDialog } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalReviewDialog';
import { SuperAdminApprovalsTable } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalsTable';
import { useApprovals } from '@/features/dashboard/super-admin/hooks/useApprovals';
import {
  DEFAULT_APPROVALS_FILTERS,
  filterSuperAdminApprovals,
  superAdminApprovalsHasActiveFilters,
  type SuperAdminApprovalsFilters,
} from '@/features/dashboard/super-admin/lib/superAdminApprovalsFilters';
import type { OrgApprovalSummary } from '@/features/dashboard/super-admin/types/approval';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function ApprovalsEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <ClipboardCheck className="text-muted-foreground size-10" aria-hidden />
      <p className="text-foreground text-sm font-medium">
        {filtered ? 'No approvals match your filters' : 'No approvals yet'}
      </p>
    </div>
  );
}

export function SuperAdminApprovalsPage() {
  const { data: approvals = [], isLoading, error } = useApprovals();
  const [filters, setFilters] = useState<SuperAdminApprovalsFilters>(DEFAULT_APPROVALS_FILTERS);
  const [selected, setSelected] = useState<OrgApprovalSummary | null>(null);

  const filteredApprovals = useMemo(
    () => filterSuperAdminApprovals(approvals, filters),
    [approvals, filters]
  );
  const hasActiveFilters = superAdminApprovalsHasActiveFilters(filters);

  return (
    <div className="space-y-3 sm:space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">Could not load approvals.</p>
      ) : (
        <>
          <AdminPageHeader title="Approvals" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 gap-2">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search
                  className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                  placeholder="Search approvals…"
                  className="h-10 pl-9"
                  aria-label="Search approvals"
                />
              </div>

              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: value as SuperAdminApprovalsFilters['status'],
                  }))
                }
              >
                <SelectTrigger className="h-10 w-[9.5rem] shrink-0">
                  <Filter className="size-4 shrink-0 opacity-70" aria-hidden />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="pending">In review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="changes">Changes requested</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredApprovals.length > 0 ? (
            <SuperAdminApprovalsTable approvals={filteredApprovals} onSelect={setSelected} />
          ) : (
            <ApprovalsEmptyState filtered={hasActiveFilters} />
          )}
        </>
      )}

      <SuperAdminApprovalReviewDialog
        approval={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
