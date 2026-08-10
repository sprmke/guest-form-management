import { useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { ArrowUpRight, Building2, Calendar, Layers, ParkingCircle } from 'lucide-react';

import { formatOrgPropertyCurrency } from '@/features/dashboard/org/lib/orgPropertyDisplay';
import {
  orgParkingsPath,
  orgPropertiesPath,
  parkingSectionPath,
  propertySectionPath,
} from '@/features/dashboard/org/lib/tenantPaths';
import type {
  DashboardParkingPerformance,
  DashboardPropertyPerformance,
} from '@/features/dashboard/property/lib/types';

import { AdminSurfaceCardHeader } from '@/components/shared/AdminSurfaceCardHeader';
import { SegmentedControl } from '@/components/ui/sliding-tabs';
import { cn } from '@/lib/utils';
import { resourceKindBadgeClasses } from '@/lib/status-tone-colors';

type AssetRow = {
  kind: 'property' | 'parking';
  id: string;
  name: string;
  slug: string;
  location: string | null;
  bookings: number;
  revenue: number;
  occupancy: number;
};

type ListingFilter = 'all' | 'property' | 'parking';

type Props = {
  orgSlug: string;
  properties: DashboardPropertyPerformance[];
  parkings?: DashboardParkingPerformance[];
  propertyCount?: number;
  parkingCount?: number;
  rangeLabel?: string;
  className?: string;
};

export function OrgPropertiesPerformanceCard({
  orgSlug,
  properties,
  parkings = [],
  propertyCount,
  parkingCount,
  rangeLabel,
  className,
}: Props) {
  const resolvedPropertyCount = propertyCount ?? properties.length;
  const resolvedParkingCount = parkingCount ?? parkings.length;
  const hasProperties = resolvedPropertyCount > 0;
  const hasParkings = resolvedParkingCount > 0;
  const showListingTabs = hasProperties && hasParkings;
  const viewListingsHref = hasProperties ? orgPropertiesPath(orgSlug) : orgParkingsPath(orgSlug);
  const [listingFilter, setListingFilter] = useState<ListingFilter>('all');

  const rows = useMemo<AssetRow[]>(() => {
    const propertyRows: AssetRow[] = properties.map((property) => ({
      kind: 'property',
      id: property.id,
      name: property.name,
      slug: property.slug,
      location: property.location,
      bookings: property.bookings,
      revenue: property.revenue,
      occupancy: property.occupancy,
    }));
    const parkingRows: AssetRow[] = parkings.map((parking) => ({
      kind: 'parking',
      id: parking.id,
      name: parking.name,
      slug: parking.slug,
      location: parking.location,
      bookings: parking.bookings,
      revenue: parking.revenue,
      occupancy: parking.occupancy,
    }));
    return [...propertyRows, ...parkingRows].sort((a, b) => b.revenue - a.revenue);
  }, [parkings, properties]);

  const visibleRows = useMemo(() => {
    if (!showListingTabs || listingFilter === 'all') return rows;
    return rows.filter((row) => row.kind === listingFilter);
  }, [listingFilter, rows, showListingTabs]);

  const emptyMessage =
    listingFilter === 'property'
      ? 'No properties in this period'
      : listingFilter === 'parking'
        ? 'No parking in this period'
        : 'No listings yet';

  const cardTitle = showListingTabs
    ? 'Listings Performance'
    : hasParkings
      ? 'Parkings Performance'
      : 'Properties Performance';

  return (
    <section
      className={cn('surface-card min-w-0 overflow-hidden p-3 sm:p-4', className)}
      aria-label={
        showListingTabs
          ? 'Listings performance'
          : hasParkings
            ? 'Parkings performance'
            : 'Properties performance'
      }
    >
      <AdminSurfaceCardHeader
        icon={Layers}
        title={cardTitle}
        description={rangeLabel ? `Revenue & occupancy · ${rangeLabel}` : 'Revenue & occupancy'}
        iconClassName="bg-muted/80"
        action={
          showListingTabs ? (
            <div className="max-w-full overflow-x-auto">
              <SegmentedControl
                value={listingFilter}
                onChange={setListingFilter}
                size="dense"
                listClassName="w-max min-w-0"
                triggerClassName="h-7 px-2.5 text-xs sm:px-3"
                aria-label="Filter listings"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'property', label: 'Properties' },
                  { value: 'parking', label: 'Parkings' },
                ]}
              />
            </div>
          ) : (
            <Link
              to={viewListingsHref}
              className="text-primary hover:bg-primary/10 inline-flex min-h-[44px] items-center rounded-lg px-2 text-sm font-semibold transition-colors"
            >
              View
            </Link>
          )
        }
      />

      {visibleRows.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {visibleRows.map((asset) => {
            const href =
              asset.kind === 'parking'
                ? parkingSectionPath(orgSlug, asset.slug, 'dashboard')
                : propertySectionPath(orgSlug, asset.slug, 'dashboard');
            const Icon = asset.kind === 'parking' ? ParkingCircle : Building2;
            const showKindBadge = showListingTabs && listingFilter === 'all';

            return (
              <Link
                key={`${asset.kind}-${asset.id}`}
                to={href}
                className="border-border hover:bg-muted/40 flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2.5 transition-colors sm:gap-3 sm:px-3 sm:py-3"
              >
                <div className="bg-primary/10 hidden size-11 shrink-0 items-center justify-center rounded-lg lg:flex">
                  <Icon className="text-primary size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {showKindBadge ? (
                      <span className={resourceKindBadgeClasses(asset.kind)}>
                        {asset.kind === 'parking' ? 'Parking' : 'Property'}
                      </span>
                    ) : null}
                    <span className="text-foreground truncate text-sm font-semibold">
                      {asset.name}
                    </span>
                    {asset.location ? (
                      <span className="text-muted-foreground hidden truncate text-xs lg:inline">
                        · {asset.location}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-[11px] sm:mt-1 sm:gap-3 sm:text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3 sm:size-3.5" aria-hidden />
                      {asset.bookings}
                      <span className="hidden sm:inline"> bookings</span>
                    </span>
                    <span className="tabular-nums">{asset.occupancy}%</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-emerald-700 sm:text-sm dark:text-emerald-300">
                    {formatOrgPropertyCurrency(asset.revenue)}
                  </p>
                </div>
                <div className="hidden w-16 flex-col gap-1 sm:w-20 lg:flex">
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${Math.min(asset.occupancy, 100)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-center text-xs tabular-nums">
                    {asset.occupancy}%
                  </span>
                </div>
                <ArrowUpRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
