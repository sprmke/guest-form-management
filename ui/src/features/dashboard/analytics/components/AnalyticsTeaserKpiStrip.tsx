import { BarChart3, Calendar, DollarSign, Percent } from 'lucide-react';

import type { AnalyticsTeaser } from '@/features/dashboard/analytics/lib/types';

import { StatCard } from '@/components/shared/StatCard';
import { formatMoney } from '@/utils/format/currency';

type Props = {
  kpis: AnalyticsTeaser['kpis'];
};

/** Free/Starter teaser — only the 4 KPIs the plan says are safe to show pre-upgrade. */
export function AnalyticsTeaserKpiStrip({ kpis }: Props) {
  return (
    <section aria-label="Key metrics (preview)">
      <div className="native-stagger grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          title="Occupancy Rate"
          value={`${kpis.occupancyRate.value}%`}
          change={kpis.occupancyRate.changePctVsPrior ?? undefined}
          changeIsPoints
          icon={Percent}
        />
        <StatCard
          title="Average Daily Rate"
          value={formatMoney(kpis.adr.value)}
          change={kpis.adr.changePctVsPrior ?? undefined}
          icon={DollarSign}
        />
        <StatCard
          title="RevPAR"
          value={formatMoney(kpis.revpar.value)}
          change={kpis.revpar.changePctVsPrior ?? undefined}
          icon={BarChart3}
        />
        <StatCard
          title="Reservations"
          value={String(kpis.reservations.value)}
          change={kpis.reservations.changePctVsPrior ?? undefined}
          icon={Calendar}
        />
      </div>
    </section>
  );
}
