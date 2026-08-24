import { useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { ClipboardCheck, Filter, Search } from 'lucide-react';

import {
  AdminListPagination,
  AdminListPerPageSelect,
} from '@/features/dashboard/bookings/components/AdminListToolbar';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminEmptyState } from '@/features/dashboard/super-admin/components/shared/SuperAdminEmptyState';
import { SuperAdminListViewToggle } from '@/features/dashboard/super-admin/components/shared/SuperAdminListViewToggle';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import { SuperAdminResultsMeta } from '@/features/dashboard/super-admin/components/shared/SuperAdminResultsMeta';
import { SuperAdminApprovalReviewDialog } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalReviewDialog';
import { SuperAdminApprovalsCardGrid } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalsCardGrid';
import { SuperAdminApprovalsSummaryCards } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalsSummaryCards';
import { SuperAdminApprovalsTable } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalsTable';
import { SuperAdminExternalReviewDialog } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminExternalReviewDialog';
import { SuperAdminListingVerificationDialog } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminListingVerificationDialog';
import { useApprovals } from '@/features/dashboard/super-admin/hooks/useApprovals';
import {
  DEFAULT_APPROVALS_FILTERS,
  isExternalReviewApprovalSummary,
  isListingVerificationApprovalSummary,
  isOrgApprovalSummary,
  superAdminApprovalsHasActiveFilters,
  type SuperAdminApprovalsFilters,
} from '@/features/dashboard/super-admin/lib/superAdminApprovalsFilters';
import type { SuperAdminListViewMode } from '@/features/dashboard/super-admin/lib/superAdminListViewMode';
import type {
  ApprovalQueueItem,
  ExternalReviewApprovalSummary,
  ListingVerificationApprovalSummary,
  OrgApprovalSummary,
} from '@/features/dashboard/super-admin/types/approval';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminMobileGridViewGuard } from '@/hooks/useAdminMobileGridViewGuard';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  buildPageItems,
  normalizeAdminPageLimit,
} from '@/lib/table/pagination';

function ApprovalsEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <SuperAdminEmptyState
      icon={ClipboardCheck}
      title={filtered ? 'No approvals match your filters' : 'No approvals yet'}
    />
  );
}

export function SuperAdminApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const limit = normalizeAdminPageLimit(
    Number(searchParams.get('limit') ?? String(ADMIN_DEFAULT_PAGE_SIZE))
  );
  const filters: SuperAdminApprovalsFilters = {
    search: searchParams.get('search') ?? DEFAULT_APPROVALS_FILTERS.search,
    status: (searchParams.get('status') ??
      DEFAULT_APPROVALS_FILTERS.status) as SuperAdminApprovalsFilters['status'],
    type: (searchParams.get('type') ??
      DEFAULT_APPROVALS_FILTERS.type) as SuperAdminApprovalsFilters['type'],
  };
  const { data, isLoading, isFetching, error } = useApprovals(filters, page, limit);
  const approvals = data?.rows ?? [];
  const total = data?.total ?? 0;
  const [selectedOrg, setSelectedOrg] = useState<OrgApprovalSummary | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingVerificationApprovalSummary | null>(
    null
  );
  const [selectedReview, setSelectedReview] = useState<ExternalReviewApprovalSummary | null>(null);
  const [viewMode, setViewMode] = useState<SuperAdminListViewMode>('table');
  const isMobileLayout = useIsBelowLg();
  useAdminMobileGridViewGuard(isMobileLayout, viewMode, setViewMode);

  const hasActiveFilters = superAdminApprovalsHasActiveFilters(filters);
  const showTableView = viewMode === 'table' && !isMobileLayout;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const pageItems = buildPageItems(page, pageCount);

  const setPage = (nextPage: number) => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (nextPage <= 1) sp.delete('page');
        else sp.set('page', String(nextPage));
        return sp;
      },
      { replace: true }
    );
  };

  const setLimit = (nextLimit: number) => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (nextLimit === ADMIN_DEFAULT_PAGE_SIZE) sp.delete('limit');
        else sp.set('limit', String(nextLimit));
        sp.delete('page');
        return sp;
      },
      { replace: true }
    );
  };

  function updateFilters(next: SuperAdminApprovalsFilters) {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (!next.search.trim()) sp.delete('search');
        else sp.set('search', next.search);
        if (next.status === DEFAULT_APPROVALS_FILTERS.status) sp.delete('status');
        else sp.set('status', next.status);
        if (next.type === 'all') sp.delete('type');
        else sp.set('type', next.type);
        sp.delete('page');
        return sp;
      },
      { replace: true }
    );
  }

  function handleSelect(item: ApprovalQueueItem) {
    if (isOrgApprovalSummary(item)) {
      setSelectedReview(null);
      setSelectedListing(null);
      setSelectedOrg(item);
      return;
    }
    if (isListingVerificationApprovalSummary(item)) {
      setSelectedOrg(null);
      setSelectedReview(null);
      setSelectedListing(item);
      return;
    }
    if (isExternalReviewApprovalSummary(item)) {
      setSelectedOrg(null);
      setSelectedListing(null);
      setSelectedReview(item);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {isLoading ? (
        <SuperAdminPageLoading metricCount={4} />
      ) : error ? (
        <p className="text-destructive text-sm">Could not load approvals.</p>
      ) : (
        <>
          <AdminPageHeader title="Approvals" subtitle="Review host verification requests." />

          <SuperAdminApprovalsSummaryCards approvals={approvals} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search
                  className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  value={filters.search}
                  onChange={(event) => updateFilters({ ...filters, search: event.target.value })}
                  placeholder="Search approvals…"
                  className="h-10 pl-9"
                  aria-label="Search approvals"
                />
              </div>

              <Select
                value={filters.type}
                onValueChange={(value) =>
                  updateFilters({
                    ...filters,
                    type: value as SuperAdminApprovalsFilters['type'],
                  })
                }
              >
                <SelectTrigger className="h-10 w-[9.5rem] shrink-0" aria-label="Filter by type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="listing_verification">Listing verification</SelectItem>
                  <SelectItem value="reviews">Reviews</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(value) =>
                  updateFilters({
                    ...filters,
                    status: value as SuperAdminApprovalsFilters['status'],
                  })
                }
              >
                <SelectTrigger className="h-10 w-[9.5rem] shrink-0" aria-label="Filter by status">
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

            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <AdminListPerPageSelect limit={limit} onChange={setLimit} />
              <SuperAdminListViewToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                hideTableView={isMobileLayout}
              />
            </div>
          </div>

          {approvals.length > 0 ? (
            showTableView ? (
              <SuperAdminApprovalsTable approvals={approvals} onSelect={handleSelect} />
            ) : (
              <SuperAdminApprovalsCardGrid approvals={approvals} onSelect={handleSelect} />
            )
          ) : (
            <ApprovalsEmptyState filtered={hasActiveFilters} />
          )}

          {pageCount > 1 ? (
            <AdminListPagination
              ariaLabel="Approvals pagination"
              page={page}
              pageCount={pageCount}
              pageItems={pageItems}
              isLoading={isLoading || isFetching}
              onPageChange={setPage}
            />
          ) : null}

          <SuperAdminResultsMeta visibleCount={approvals.length} totalCount={total} />
        </>
      )}

      <SuperAdminApprovalReviewDialog
        approval={selectedOrg}
        onOpenChange={(open) => {
          if (!open) setSelectedOrg(null);
        }}
      />

      <SuperAdminListingVerificationDialog
        approval={selectedListing}
        onOpenChange={(open) => {
          if (!open) setSelectedListing(null);
        }}
      />

      <SuperAdminExternalReviewDialog
        approval={selectedReview}
        onOpenChange={(open) => {
          if (!open) setSelectedReview(null);
        }}
      />
    </div>
  );
}
