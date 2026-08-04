import { Link } from 'react-router-dom';

import { ArrowUpRight, Building2, Calendar, Home } from 'lucide-react';

import { formatOrgPropertyCurrency } from '@/features/dashboard/org/lib/orgPropertyDisplay';
import { orgPropertiesPath, propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import type { DashboardPropertyPerformance } from '@/features/dashboard/property/lib/types';

type Props = {
  orgSlug: string;
  properties: DashboardPropertyPerformance[];
};

export function OrgPropertiesPerformanceCard({ orgSlug, properties }: Props) {
  return (
    <section className="surface-card min-w-0 p-3 sm:p-4 lg:col-span-2">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-section-title">Properties Performance</p>
        <Link
          to={orgPropertiesPath(orgSlug)}
          className="text-primary inline-flex min-h-[44px] items-center text-xs font-semibold hover:underline"
        >
          Manage
        </Link>
      </div>

      {properties.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">No properties yet</p>
      ) : (
        <div className="space-y-2">
          {properties.map((property) => (
            <Link
              key={property.id}
              to={propertySectionPath(orgSlug, property.slug, 'dashboard')}
              className="border-border hover:bg-muted/40 flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2.5 transition-colors sm:gap-3 sm:px-3 sm:py-3"
            >
              <div className="bg-primary/10 hidden size-11 shrink-0 items-center justify-center rounded-lg lg:flex">
                <Building2 className="text-primary size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-foreground truncate text-sm font-semibold">
                    {property.name}
                  </span>
                  {property.location ? (
                    <span className="text-muted-foreground hidden truncate text-xs lg:inline">
                      · {property.location}
                    </span>
                  ) : null}
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-[11px] sm:mt-1 sm:gap-3 sm:text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3 sm:size-3.5" aria-hidden />
                    {property.bookings}
                    <span className="hidden sm:inline"> bookings</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Home className="size-3 sm:size-3.5" aria-hidden />
                    {property.occupancy}%
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-emerald-700 sm:text-sm dark:text-emerald-300">
                  {formatOrgPropertyCurrency(property.revenue)}
                </p>
              </div>
              <div className="hidden w-16 flex-col gap-1 sm:w-20 lg:flex">
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${Math.min(property.occupancy, 100)}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-center text-xs">
                  {property.occupancy}%
                </span>
              </div>
              <ArrowUpRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
