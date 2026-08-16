import { Calendar, Car, Coins, Percent } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { orgParkingsSummaryFromList } from '@/features/dashboard/org/lib/orgParkingCardModel';
import { formatOrgParkingCurrency } from '@/features/dashboard/org/lib/orgParkingDisplay';
import type { Parking } from '@/features/dashboard/org/types';

type Props = {
  parkings: Parking[];
};

export function OrgParkingsSummaryCards({ parkings }: Props) {
  const summary = orgParkingsSummaryFromList(parkings);

  return (
    <section
      aria-label="Parking summary"
      className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4"
    >
      <AdminMetricCard
        title="Total parkings"
        value={String(summary.total)}
        icon={Car}
        iconClassName="text-sky-600 dark:text-sky-400"
        iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
      />
      <AdminMetricCard
        title="Total Revenue"
        value={formatOrgParkingCurrency(summary.totalRevenue)}
        icon={Coins}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
      />
      <AdminMetricCard
        title="Avg Monthly Revenue"
        value={formatOrgParkingCurrency(summary.avgMonthlyRevenue)}
        icon={Calendar}
        iconClassName="text-violet-600 dark:text-violet-400"
        iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
      />
      <AdminMetricCard
        title="Avg Occupancy"
        value={`${summary.avgOccupancy}%`}
        icon={Percent}
        iconClassName="text-amber-600 dark:text-amber-400"
        iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
      />
    </section>
  );
}
