import { Building2, Calendar, DollarSign, Percent } from 'lucide-react';

import { DashboardTrendStatCard } from '@/features/dashboard/property/components/DashboardTrendStatCard';
import type { DashboardStats } from '@/features/dashboard/property/lib/types';

import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format/currency';

type Props = {
  stats: DashboardStats;
  periodLabel: string;
};

export function OrgDashboardStatCards({ stats, periodLabel }: Props) {
  const { kpis, propertyCount } = stats;

  return (
    <section aria-label="Key metrics">
      <p className="section-eyebrow mb-2 hidden px-0.5 sm:mb-3 lg:block">{periodLabel}</p>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <DashboardTrendStatCard
          title="Total Revenue"
          value={formatMoney(kpis.netProfit.value)}
          change={kpis.netProfit.changePercent}
          icon={DollarSign}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
          valueClassName={cn(
            kpis.netProfit.value >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          )}
        />
        <DashboardTrendStatCard
          title="Total Bookings"
          value={String(kpis.checkInsInPeriod.value)}
          change={kpis.checkInsInPeriod.changePercent}
          icon={Calendar}
          iconClassName="text-sky-600 dark:text-sky-400"
          iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
        />
        <DashboardTrendStatCard
          title="Occupancy Rate"
          value={`${kpis.occupancyRate.value}%`}
          change={kpis.occupancyRate.changePoints}
          changeIsPoints
          icon={Percent}
          iconClassName="text-rose-600 dark:text-rose-400"
          iconBgClassName="bg-rose-100 dark:bg-rose-900/30"
        />
        <DashboardTrendStatCard
          title="Total Properties"
          value={String(propertyCount)}
          icon={Building2}
          iconClassName="text-violet-600 dark:text-violet-400"
          iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
        />
      </div>
    </section>
  );
}
