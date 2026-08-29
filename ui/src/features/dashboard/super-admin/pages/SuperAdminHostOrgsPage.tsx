import { useEffect, useRef } from 'react';

import { useParams } from 'react-router-dom';

import {
  AdminListPagination,
  AdminListPerPageSelect,
} from '@/features/dashboard/bookings/components/AdminListToolbar';
import {
  SuperAdminHostOrgCard,
  SuperAdminHostOrgsEmptyState,
} from '@/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostOrgCard';
import { useAdminListPaginationParams } from '@/features/dashboard/super-admin/hooks/useAdminListPaginationParams';
import { useHostOrganizations } from '@/features/dashboard/super-admin/hooks/useHosts';

import { HostOrgCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { buildPageItems } from '@/lib/table/pagination';

export function SuperAdminHostOrgsPage() {
  const { hostId = '' } = useParams<{ hostId: string }>();
  const { page, limit, setPage, setLimit } = useAdminListPaginationParams();

  const { data, isLoading, isFetching, error } = useHostOrganizations(hostId, page, limit);
  const organizations = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const pageItems = buildPageItems(page, pageCount);

  // Reset to page 1 when switching between hosts (route param changes but the
  // page component instance is reused).
  const prevHostIdRef = useRef(hostId);
  useEffect(() => {
    if (prevHostIdRef.current !== hostId) {
      prevHostIdRef.current = hostId;
      setPage(1);
    }
  }, [hostId, setPage]);

  if (isLoading) {
    return <HostOrgCardGridSkeleton count={6} />;
  }

  if (error) {
    return <p className="text-destructive text-sm">Could not load organizations.</p>;
  }

  if (organizations.length === 0) {
    return <SuperAdminHostOrgsEmptyState />;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex justify-end">
        <AdminListPerPageSelect limit={limit} onChange={setLimit} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((organization) => (
          <SuperAdminHostOrgCard key={organization.id} organization={organization} />
        ))}
      </div>

      {pageCount > 1 ? (
        <AdminListPagination
          ariaLabel="Host organizations pagination"
          page={page}
          pageCount={pageCount}
          pageItems={pageItems}
          isLoading={isLoading || isFetching}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
