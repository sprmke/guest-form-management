import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Loader2, Plus } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { BookingDateRangeFilter } from '@/features/dashboard/bookings/components/BookingDateRangeFilter';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from '@/features/dashboard/bookings/hooks/useDateNavigation';
import { AddEntityDialog } from '@/features/dashboard/org/components/AddEntityDialog';
import { OrgBookingStatusDonut } from '@/features/dashboard/org/components/org-dashboard/OrgBookingStatusDonut';
import { OrgDashboardStatCards } from '@/features/dashboard/org/components/org-dashboard/OrgDashboardStatCards';
import { OrgPendingActionsCard } from '@/features/dashboard/org/components/org-dashboard/OrgPendingActionsCard';
import { OrgPropertiesPerformanceCard } from '@/features/dashboard/org/components/org-dashboard/OrgPropertiesPerformanceCard';
import { OrgRecentBookingsList } from '@/features/dashboard/org/components/org-dashboard/OrgRecentBookingsList';
import { OrgRevenueBookingsChart } from '@/features/dashboard/org/components/org-dashboard/OrgRevenueBookingsChart';
import { useOrganizations, useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import { useOrgDashboardStats } from '@/features/dashboard/org/hooks/useOrgDashboardStats';
import {
  canCreateParkingsInOrg,
  canCreatePropertiesInOrg,
} from '@/features/dashboard/org/lib/orgAccessKind';
import {
  parkingSectionPath,
  propertySectionPath,
  setLastParkingContext,
  setLastTenantContext,
} from '@/features/dashboard/org/lib/tenantPaths';
import {
  defaultDashboardPeriod,
  resolveDashboardPeriod,
  writeDashboardPeriodParams,
} from '@/features/dashboard/property/lib/dashboardPeriod';

import { Button } from '@/components/ui/button';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { detectPresetFromRange, fromIsoDate } from '@/lib/date/navigation';
import { cn } from '@/lib/utils';

export function OrgDashboardPage() {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const isBelowMd = useIsBelowMd();
  const { data: orgsData } = useOrganizations();
  const { data: propsData } = useProperties(orgSlug);
  const { data, isLoading, error, refetch } = useOrgDashboardStats();

  const org = orgsData?.organizations.find((o) => o.slug === orgSlug);
  const properties = propsData?.properties ?? [];
  const defaultPropertySlug = properties[0]?.slug ?? null;
  const canAddProperty = canCreatePropertiesInOrg(org?.accessKind);
  const canAddParking = canCreateParkingsInOrg(org?.accessKind);
  const canAddAsset = Boolean(org && (canAddProperty || canAddParking));

  const period = useMemo(() => resolveDashboardPeriod(searchParams), [searchParams]);

  const initialFrom = fromIsoDate(period.from);
  const initialTo = fromIsoDate(period.to);
  const dateNav = useDateNavigation({
    initialPreset:
      initialFrom && initialTo ? detectPresetFromRange(initialFrom, initialTo) : 'month',
    initialRange: initialFrom && initialTo ? { from: initialFrom, to: initialTo } : null,
  });

  useEffect(() => {
    if (searchParams.get('from') || searchParams.get('to')) return;
    const def = defaultDashboardPeriod();
    setSearchParams(writeDashboardPeriodParams(def, searchParams), {
      replace: true,
    });
  }, [searchParams, setSearchParams]);

  const patchPeriod = useCallback(
    (next: { from: string | null; to: string | null }) => {
      if (!next.from || !next.to) return;
      setSearchParams(writeDashboardPeriodParams({ from: next.from, to: next.to }, searchParams), {
        replace: true,
      });
    },
    [searchParams, setSearchParams]
  );

  useSyncDateRangeWithQuery(dateNav, period.from, period.to, patchPeriod);

  const handleClearDate = useCallback(() => {
    dateNav.setDatePreset('year');
  }, [dateNav]);

  const trendLabel = data?.trendWindow.label ?? '';

  return (
    <RequireAdmin>
      <div className="min-w-0 max-w-full space-y-3 sm:space-y-4">
        <section className="mb-3 w-full min-w-0">
          <AdminPageHeader
            id="org-dashboard-heading"
            title="Dashboard"
            subtitle="Performance overview across all properties in your organization."
            actions={
              <div
                className={cn(
                  'flex flex-wrap items-center gap-2',
                  isBelowMd && 'w-full justify-end'
                )}
              >
                <BookingDateRangeFilter
                  {...dateNav}
                  isActive
                  onClear={handleClearDate}
                  fullWidth={isBelowMd}
                />
                {canAddAsset ? (
                  <Button
                    type="button"
                    onClick={() => setAddAssetOpen(true)}
                    className="min-h-[44px] gap-1.5"
                  >
                    <Plus className="size-4" aria-hidden />
                    Add asset
                  </Button>
                ) : null}
              </div>
            }
            actionsClassName={isBelowMd ? 'w-full justify-end' : 'self-center'}
          />
        </section>

        {isLoading && !data ? (
          <div className="flex justify-center py-16">
            <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
          </div>
        ) : error ? (
          <div className="surface-card flex flex-col items-center gap-3 px-4 py-16 text-center">
            <p className="text-foreground text-sm font-semibold">Could not load dashboard</p>
            <p className="text-caption max-w-sm">
              {error instanceof Error ? error.message : 'Please try again.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="gradient-primary text-primary-foreground shadow-soft inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold hover:brightness-[1.03]"
            >
              Retry
            </button>
          </div>
        ) : data && orgSlug ? (
          <>
            <OrgDashboardStatCards stats={data} periodLabel={trendLabel} />

            <div className="grid min-w-0 gap-3 lg:grid-cols-3 lg:gap-4">
              <OrgRevenueBookingsChart data={data.trendSeries} isLoading={isLoading} />
              <OrgBookingStatusDonut slices={data.statusBreakdown} />
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-3 lg:gap-4">
              <OrgRecentBookingsList orgSlug={orgSlug} bookings={data.recentBookings} />
              <OrgPendingActionsCard
                orgSlug={orgSlug}
                defaultPropertySlug={defaultPropertySlug}
                items={data.attention}
              />
            </div>

            <OrgPropertiesPerformanceCard orgSlug={orgSlug} properties={data.propertyPerformance} />
          </>
        ) : !org ? (
          <p className="text-muted-foreground text-sm">Organization not found.</p>
        ) : null}

        {org && orgSlug ? (
          <AddEntityDialog
            open={addAssetOpen}
            onOpenChange={setAddAssetOpen}
            orgId={org.id}
            orgSlug={orgSlug}
            orgName={org.name}
            canAddProperty={canAddProperty}
            canAddParking={canAddParking}
            onPropertyCreated={(property) => {
              setLastTenantContext(orgSlug, property.slug);
              navigate(propertySectionPath(orgSlug, property.slug, 'dashboard'));
            }}
            onParkingCreated={(parking) => {
              setLastParkingContext(orgSlug, parking.slug);
              navigate(parkingSectionPath(orgSlug, parking.slug, 'dashboard'));
            }}
          />
        ) : null}
      </div>
    </RequireAdmin>
  );
}
