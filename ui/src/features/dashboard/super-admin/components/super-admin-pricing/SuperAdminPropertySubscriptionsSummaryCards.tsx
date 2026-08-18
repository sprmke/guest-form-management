import { Building2, CheckCircle2, CircleDashed, Users } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { superAdminPropertySubscriptionsSummaryFromList } from '@/features/dashboard/super-admin/lib/superAdminPricingFilters';
import type { PropertySubscriptionSummary } from '@/features/dashboard/super-admin/types/pricingPlan';

type Props = {
  properties: PropertySubscriptionSummary[];
};

export function SuperAdminPropertySubscriptionsSummaryCards({ properties }: Props) {
  const summary = superAdminPropertySubscriptionsSummaryFromList(properties);

  return (
    <section
      aria-label="Property subscription summary"
      className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4"
    >
      <AdminMetricCard
        title="Properties"
        value={String(summary.total)}
        icon={Building2}
        iconClassName="text-sky-600 dark:text-sky-400"
        iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
      />
      <AdminMetricCard
        title="Assigned"
        value={String(summary.assigned)}
        icon={CheckCircle2}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
      />
      <AdminMetricCard
        title="Unassigned"
        value={String(summary.unassigned)}
        icon={CircleDashed}
        iconClassName="text-amber-600 dark:text-amber-400"
        iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
      />
      <AdminMetricCard
        title="Organizations"
        value={String(summary.organizations)}
        icon={Users}
        iconClassName="text-violet-600 dark:text-violet-400"
        iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
      />
    </section>
  );
}
