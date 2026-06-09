import { Link } from 'react-router-dom';
import {
  BedDouble,
  CircleDollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
import { formatMoney } from '@/features/admin/lib/formatters';
import { FinanceKpiCard } from '@/features/finance/components/FinanceKpiCard';
import type { DashboardStats } from '@/features/dashboard/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  stats: DashboardStats;
  periodLabel: string;
};

export function DashboardStatCards({ stats, periodLabel }: Props) {
  const { totals, finance, trendWindow } = stats;
  const financeHref = `/finance?tab=overview&from=${trendWindow.from}&to=${trendWindow.to}`;

  return (
    <section aria-label="Key metrics">
      <p className="section-eyebrow mb-3 px-0.5">{periodLabel}</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceKpiCard
          label="Net profit"
          value={formatMoney(finance.monthNet)}
          icon={TrendingUp}
          iconColor="text-primary"
          valueClassName={cn(
            finance.monthNet >= 0
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-600 dark:text-red-400',
          )}
        />
        <FinanceKpiCard
          label="Active pipeline"
          value={String(totals.activeBookings)}
          icon={Users}
          iconColor="text-primary"
        />
        <Link
          to={`/bookings?from=${trendWindow.from}&to=${trendWindow.to}`}
          className="block min-w-0"
        >
          <FinanceKpiCard
            label="Total bookings"
            value={`${totals.totalBookings} / ${totals.periodDays}`}
            icon={BedDouble}
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </Link>
        <Link to={financeHref} className="block min-w-0">
          <FinanceKpiCard
            label="Outstanding"
            value={formatMoney(finance.outstandingBalance)}
            icon={CircleDollarSign}
            iconColor="text-amber-600 dark:text-amber-400"
            valueClassName={cn(
              finance.outstandingBalance > 0
                ? 'text-amber-700 dark:text-amber-300'
                : undefined,
            )}
          />
        </Link>
      </div>
    </section>
  );
}
