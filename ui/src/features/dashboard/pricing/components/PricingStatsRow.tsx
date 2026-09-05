import { Calendar, DollarSign, Tag, TrendingUp, Wand2 } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';

import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/utils/format/currency';

type Props = {
  weekdayRate: number;
  weekendRate: number;
  customDatesCount: number;
  enabledFeesTotal: number;
  /** Applied Smart Pricing nights in the current view — shows a 5th card when > 0. */
  smartDatesCount?: number;
};

export function PricingStatsRow({
  weekdayRate,
  weekendRate,
  customDatesCount,
  enabledFeesTotal,
  smartDatesCount = 0,
}: Props) {
  const weekendPremium = Math.round(((weekendRate - weekdayRate) / weekdayRate) * 100);
  const showSmart = smartDatesCount > 0;

  return (
    <section
      aria-label="Pricing summary"
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4',
        showSmart ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
      )}
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
      {showSmart ? (
        <AdminMetricCard
          title="Smart Pricing"
          value={String(smartDatesCount)}
          icon={Wand2}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
        />
      ) : null}
    </section>
  );
}
