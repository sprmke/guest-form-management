import { useState } from 'react';

import { Link } from 'react-router-dom';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import { SuperAdminAiCostChart } from '@/features/dashboard/super-admin/components/super-admin-overview/SuperAdminAiCostChart';
import { SuperAdminAttentionPanel } from '@/features/dashboard/super-admin/components/super-admin-overview/SuperAdminAttentionPanel';
import { SuperAdminGrowthChart } from '@/features/dashboard/super-admin/components/super-admin-overview/SuperAdminGrowthChart';
import { SuperAdminOverviewKpis } from '@/features/dashboard/super-admin/components/super-admin-overview/SuperAdminOverviewKpis';
import { SuperAdminPlanMixDonut } from '@/features/dashboard/super-admin/components/super-admin-overview/SuperAdminPlanMixDonut';
import { SuperAdminRecentActivity } from '@/features/dashboard/super-admin/components/super-admin-overview/SuperAdminRecentActivity';
import {
  useSuperAdminOverview,
  type SuperAdminOverviewRange,
} from '@/features/dashboard/super-admin/hooks/useSuperAdminOverview';
import { SUPER_ADMIN_PLATFORM_DESTINATIONS } from '@/features/dashboard/super-admin/lib/superAdminPlatformNav';

import { SegmentedControl } from '@/components/ui/sliding-tabs';

const RANGE_LABELS: Record<SuperAdminOverviewRange, string> = {
  '30d': 'last 30 days',
  '90d': 'last 90 days',
  '12mo': 'last 12 months',
};

export function SuperAdminOverviewPage() {
  const [range, setRange] = useState<SuperAdminOverviewRange>('30d');
  const { data, isLoading, error } = useSuperAdminOverview(range);

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        title="Overview"
        subtitle="Platform health across organizations, billing, operations, and AI."
        actions={
          <SegmentedControl
            value={range}
            onChange={setRange}
            size="dense"
            equalSegments
            aria-label="Time range"
            options={[
              { value: '30d', label: '30d' },
              { value: '90d', label: '90d' },
              { value: '12mo', label: '12mo' },
            ]}
          />
        }
      />

      {isLoading && !data ? (
        <SuperAdminPageLoading metricCount={8} />
      ) : error ? (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : 'Could not load the platform overview.'}
        </p>
      ) : data ? (
        <div className="space-y-3 sm:space-y-4">
          <SuperAdminOverviewKpis kpis={data.kpis} />

          <div className="grid min-w-0 items-stretch gap-3 sm:gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SuperAdminGrowthChart data={data.growthSeries} />
            </div>
            <SuperAdminPlanMixDonut planMix={data.planMix} />
          </div>

          <div className="grid min-w-0 items-stretch gap-3 sm:gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SuperAdminAiCostChart data={data.aiCostByFeature} rangeLabel={RANGE_LABELS[range]} />
            </div>
            <SuperAdminAttentionPanel attention={data.attention} />
          </div>

          <SuperAdminRecentActivity recent={data.recent} />

          <section className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Jump to
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {SUPER_ADMIN_PLATFORM_DESTINATIONS.map(({ label, href, Icon }) => (
                <Link
                  key={href}
                  to={href}
                  className="border-border bg-card hover:border-primary/40 flex min-h-[56px] items-center gap-3 rounded-xl border p-3 transition-colors"
                >
                  <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
