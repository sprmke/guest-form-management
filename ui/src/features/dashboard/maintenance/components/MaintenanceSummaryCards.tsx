import { Bell, CheckCircle2, Clock3, ListChecks } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';
import type { MaintenanceSummary } from '@/features/dashboard/maintenance/lib/types';

import { cn } from '@/lib/utils';

type Props = Pick<MaintenanceSummary, 'total' | 'telegramEnabled' | 'completed' | 'pending'>;

export function MaintenanceSummaryCards({ total, telegramEnabled, completed, pending }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
      <AdminMetricCard
        title="Total"
        value={String(total)}
        icon={ListChecks}
        iconClassName="text-violet-600 dark:text-violet-400"
        iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
      />
      <AdminMetricCard
        title="Telegram enabled"
        value={String(telegramEnabled)}
        icon={Bell}
        iconClassName="text-sky-600 dark:text-sky-400"
        iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
      />
      <AdminMetricCard
        title="Completed"
        value={String(completed)}
        icon={CheckCircle2}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
        valueClassName="text-emerald-600 dark:text-emerald-400"
      />
      <AdminMetricCard
        title="Pending"
        value={String(pending)}
        icon={Clock3}
        iconClassName="text-amber-600 dark:text-amber-400"
        iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
        valueClassName={cn(pending > 0 ? 'text-amber-600 dark:text-amber-400' : undefined)}
      />
    </div>
  );
}
