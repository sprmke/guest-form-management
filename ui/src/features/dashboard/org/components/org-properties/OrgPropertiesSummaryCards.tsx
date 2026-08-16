import { Building2, Calendar, Coins, Users } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { orgPropertiesSummaryFromList } from '@/features/dashboard/org/lib/orgPropertyCardModel';
import { formatOrgPropertyCurrency } from '@/features/dashboard/org/lib/orgPropertyDisplay';
import type { Property } from '@/features/dashboard/org/types';

type Props = {
  properties: Property[];
};

export function OrgPropertiesSummaryCards({ properties }: Props) {
  const summary = orgPropertiesSummaryFromList(properties);

  return (
    <section
      aria-label="Property summary"
      className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4"
    >
      <AdminMetricCard
        title="Total properties"
        value={String(summary.total)}
        icon={Building2}
        iconClassName="text-sky-600 dark:text-sky-400"
        iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
      />
      <AdminMetricCard
        title="Total Revenue"
        value={formatOrgPropertyCurrency(summary.totalRevenue)}
        icon={Coins}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
      />
      <AdminMetricCard
        title="Avg Monthly Revenue"
        value={formatOrgPropertyCurrency(summary.avgMonthlyRevenue)}
        icon={Calendar}
        iconClassName="text-violet-600 dark:text-violet-400"
        iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
      />
      <AdminMetricCard
        title="Avg Occupancy"
        value={`${summary.avgOccupancy}%`}
        icon={Users}
        iconClassName="text-amber-600 dark:text-amber-400"
        iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
      />
    </section>
  );
}
