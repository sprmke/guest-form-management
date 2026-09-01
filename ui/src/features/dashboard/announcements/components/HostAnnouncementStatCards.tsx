import { AlertTriangle, Info, Megaphone, ShieldAlert } from 'lucide-react';

import type { HostAnnouncementSummary } from '@/features/dashboard/announcements/lib/hostAnnouncementPresentation';

import { StatCard } from '@/components/shared/StatCard';

type HostAnnouncementStatCardsProps = {
  summary: HostAnnouncementSummary;
};

export function HostAnnouncementStatCards({ summary }: HostAnnouncementStatCardsProps) {
  return (
    <section aria-label="Announcement summary">
      <div className="native-stagger grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          title="Active"
          value={String(summary.total)}
          icon={Megaphone}
          iconClassName="text-slate-600 dark:text-slate-300"
          iconBgClassName="bg-slate-100 dark:bg-slate-800/60"
        />
        <StatCard
          title="Action required"
          value={String(summary.critical)}
          icon={ShieldAlert}
          iconClassName="text-rose-600 dark:text-rose-400"
          iconBgClassName="bg-rose-100 dark:bg-rose-900/30"
        />
        <StatCard
          title="Attention"
          value={String(summary.warning)}
          icon={AlertTriangle}
          iconClassName="text-amber-600 dark:text-amber-400"
          iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
        />
        <StatCard
          title="Updates"
          value={String(summary.info)}
          icon={Info}
          iconClassName="text-sky-600 dark:text-sky-400"
          iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
        />
      </div>
    </section>
  );
}
