import type { ReactNode } from 'react';

import { Link } from 'react-router-dom';

import { Car, DollarSign, FileText, Percent } from 'lucide-react';

import { DashboardTrendStatCard } from '@/features/dashboard/property/components/DashboardTrendStatCard';
import type { DashboardStats } from '@/features/dashboard/property/lib/types';

import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format/currency';

type Props = {
  stats: DashboardStats;
  periodLabel: string;
  reservationsHref?: string;
};

function TrendCardLink({ to, children }: { to?: string; children: ReactNode }) {
  if (!to) return <>{children}</>;
  return (
    <Link to={to} className="block min-w-0">
      {children}
    </Link>
  );
}

export function ParkingDashboardStatCards({ stats, periodLabel, reservationsHref }: Props) {
  const { trendWindow, kpis } = stats;

  return (
    <section aria-label="Key metrics">
      <p className="section-eyebrow mb-2 px-0.5 sm:mb-3">{periodLabel || trendWindow.label}</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
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
        <TrendCardLink to={reservationsHref}>
          <DashboardTrendStatCard
            title="Total Reservations"
            value={`${kpis.nightsBooked.value} / ${kpis.nightsBooked.periodDays}`}
            change={kpis.totalBookings.changePercent}
            icon={FileText}
            iconClassName="text-sky-600 dark:text-sky-400"
            iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
          />
        </TrendCardLink>
        <DashboardTrendStatCard
          title="Occupancy Rate"
          value={`${kpis.occupancyRate.value}%`}
          change={kpis.occupancyRate.changePoints}
          changeLabel="vs last period"
          changeIsPoints
          icon={Percent}
          iconClassName="text-violet-600 dark:text-violet-400"
          iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
        />
        <DashboardTrendStatCard
          title="Average Nightly Rate"
          value={formatMoney(kpis.avgNightlyRate.value)}
          change={kpis.avgNightlyRate.changePercent}
          icon={Car}
          iconClassName="text-amber-600 dark:text-amber-400"
          iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
        />
      </div>
    </section>
  );
}
