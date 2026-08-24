import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useParams, useSearchParams } from 'react-router-dom';

import {
  AdminListPagination,
  AdminListPerPageSelect,
} from '@/features/dashboard/bookings/components/AdminListToolbar';
import {
  OrgPropertiesResultsMeta,
  OrgPropertiesToolbar,
} from '@/features/dashboard/org/components/org-properties/OrgPropertiesToolbar';
import {
  OrgPropertiesEmptyState,
  OrgPropertyCard,
  OrgPropertyListRow,
} from '@/features/dashboard/org/components/org-properties/OrgPropertyCard';
import {
  orgPropertiesHasActiveFilters,
  type OrgPropertiesFilters,
  type OrgPropertiesViewMode,
} from '@/features/dashboard/org/lib/orgPropertiesFilters';
import { useHostProperties } from '@/features/dashboard/super-admin/hooks/useHosts';
import { hostPropertyToProperty } from '@/features/dashboard/super-admin/lib/hostPropertyAdapter';

import { ListingCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  buildPageItems,
  normalizeAdminPageLimit,
} from '@/lib/table/pagination';

export function SuperAdminHostPropertiesPage() {
  const { hostId = '' } = useParams<{ hostId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const limit = normalizeAdminPageLimit(
    Number(searchParams.get('limit') ?? String(ADMIN_DEFAULT_PAGE_SIZE))
  );
  const filters: OrgPropertiesFilters = {
    search: searchParams.get('q') ?? '',
    status: (searchParams.get('status') as OrgPropertiesFilters['status']) ?? 'all',
    type: searchParams.get('type') ?? 'all',
  };

  const { data, isLoading, isFetching, error } = useHostProperties(hostId, {
    page,
    limit,
    q: filters.search,
    status: filters.status,
    type: filters.type,
  });
  const hostProperties = useMemo(() => data?.rows ?? [], [data]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const pageItems = buildPageItems(page, pageCount);

  const [viewMode, setViewMode] = useState<OrgPropertiesViewMode>('grid');

  const setPage = useCallback(
    (nextPage: number) =>
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (nextPage <= 1) sp.delete('page');
          else sp.set('page', String(nextPage));
          return sp;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  const setLimit = useCallback(
    (nextLimit: number) =>
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (nextLimit === ADMIN_DEFAULT_PAGE_SIZE) sp.delete('limit');
          else sp.set('limit', String(nextLimit));
          sp.delete('page');
          return sp;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  const updateFilters = (updater: (current: OrgPropertiesFilters) => OrgPropertiesFilters) => {
    const next = updater(filters);
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (next.search) sp.set('q', next.search);
        else sp.delete('q');
        if (next.status !== 'all') sp.set('status', next.status);
        else sp.delete('status');
        if (next.type !== 'all') sp.set('type', next.type);
        else sp.delete('type');
        sp.delete('page');
        return sp;
      },
      { replace: true }
    );
  };

  // Reset page + filters when switching between hosts (route param changes
  // but the page component instance is reused).
  const prevHostIdRef = useRef(hostId);
  useEffect(() => {
    if (prevHostIdRef.current !== hostId) {
      prevHostIdRef.current = hostId;
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          sp.delete('page');
          sp.delete('q');
          sp.delete('status');
          sp.delete('type');
          return sp;
        },
        { replace: true }
      );
    }
  }, [hostId, setSearchParams]);

  const properties = useMemo(() => hostProperties.map(hostPropertyToProperty), [hostProperties]);

  const orgSlugByPropertyId = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of hostProperties) {
      map.set(property.id, property.organizationSlug);
    }
    return map;
  }, [hostProperties]);

  const orgNameByPropertyId = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of hostProperties) {
      map.set(property.id, property.organizationName);
    }
    return map;
  }, [hostProperties]);

  const hasActiveFilters = orgPropertiesHasActiveFilters(filters);

  if (isLoading) {
    return <ListingCardGridSkeleton count={8} label="Loading properties" />;
  }

  if (error) {
    return <p className="text-destructive text-sm">Could not load properties.</p>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <OrgPropertiesToolbar
          filters={filters}
          viewMode={viewMode}
          onSearchChange={(search) => updateFilters((current) => ({ ...current, search }))}
          onStatusChange={(status) => updateFilters((current) => ({ ...current, status }))}
          onTypeChange={(type) => updateFilters((current) => ({ ...current, type }))}
          onViewModeChange={setViewMode}
        />
        <AdminListPerPageSelect limit={limit} onChange={setLimit} />
      </div>

      {properties.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map((property) => (
              <HostPropertyGridItem
                key={property.id}
                property={property}
                orgSlug={orgSlugByPropertyId.get(property.id) ?? ''}
                orgName={orgNameByPropertyId.get(property.id) ?? ''}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <HostPropertyListItem
                key={property.id}
                property={property}
                orgSlug={orgSlugByPropertyId.get(property.id) ?? ''}
                orgName={orgNameByPropertyId.get(property.id) ?? ''}
              />
            ))}
          </div>
        )
      ) : (
        <OrgPropertiesEmptyState filtered={hasActiveFilters} canAdd={false} onAdd={() => {}} />
      )}

      <OrgPropertiesResultsMeta visibleCount={properties.length} totalCount={total} />

      {pageCount > 1 ? (
        <AdminListPagination
          ariaLabel="Host properties pagination"
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

function HostPropertyGridItem({
  property,
  orgSlug,
  orgName,
}: {
  property: ReturnType<typeof hostPropertyToProperty>;
  orgSlug: string;
  orgName: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground truncate px-0.5 text-xs">{orgName}</p>
      <OrgPropertyCard property={property} orgSlug={orgSlug} />
    </div>
  );
}

function HostPropertyListItem({
  property,
  orgSlug,
  orgName,
}: {
  property: ReturnType<typeof hostPropertyToProperty>;
  orgSlug: string;
  orgName: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground truncate px-0.5 text-xs">{orgName}</p>
      <OrgPropertyListRow property={property} orgSlug={orgSlug} />
    </div>
  );
}
