import { Calendar, DollarSign, Tag, TrendingUp } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';

import { formatMoneyCompact } from '@/utils/format/currency';

type Props = {
  weekdayRate: number;
  weekendRate: number;
  customDatesCount: number;
  enabledFeesTotal: number;
};

export function PricingStatsRow({
  weekdayRate,
  weekendRate,
  customDatesCount,
  enabledFeesTotal,
}: Props) {
  const weekendPremium = Math.round(((weekendRate - weekdayRate) / weekdayRate) * 100);

  return (
    <section
      aria-label="Pricing summary"
      className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4"
    >
      <AdminMetricCard
        title="Base Rate"
        value={formatMoneyCompact(weekdayRate)}
        icon={DollarSign}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
      />
      <AdminMetricCard
        title="Weekend Premium"
        value={`+${weekendPremium}%`}
        icon={TrendingUp}
        iconClassName="text-sky-600 dark:text-sky-400"
        iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
      />
      <AdminMetricCard
        title="Custom Dates"
        value={String(customDatesCount)}
        icon={Calendar}
        iconClassName="text-violet-600 dark:text-violet-400"
        iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
      />
      <AdminMetricCard
        title="Fixed Fees"
        value={formatMoneyCompact(enabledFeesTotal)}
        icon={Tag}
        iconClassName="text-amber-600 dark:text-amber-400"
        iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
      />
    </section>
  );
}
