import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BedDouble, DollarSign, FileText, Percent, Users } from "lucide-react";
import { formatMoney } from "@/features/admin/lib/formatters";
import { DashboardTrendStatCard } from "@/features/dashboard/components/DashboardTrendStatCard";
import type { DashboardStats } from "@/features/dashboard/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  stats: DashboardStats;
  periodLabel: string;
};

function TrendCardLink({ to, children }: { to?: string; children: ReactNode }) {
  if (!to) return <>{children}</>;
  return (
    <Link to={to} className="block min-w-0">
      {children}
    </Link>
  );
}

export function DashboardStatCards({ stats, periodLabel }: Props) {
  const { totals, trendWindow, kpis } = stats;
  const bookingsHref = `/bookings?from=${trendWindow.from}&to=${trendWindow.to}`;

  return (
    <section aria-label="Key metrics">
      <p className="section-eyebrow mb-3 px-0.5">{periodLabel}</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardTrendStatCard
          title="Net profit"
          value={formatMoney(kpis.netProfit.value)}
          change={kpis.netProfit.changePercent}
          icon={DollarSign}
          iconBgClassName="bg-emerald-500"
          valueClassName={cn(
            kpis.netProfit.value >= 0
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-red-600 dark:text-red-400",
          )}
        />
        <TrendCardLink to={bookingsHref}>
          <DashboardTrendStatCard
            title="Total bookings"
            value={`${totals.totalBookings} / ${totals.periodDays}`}
            change={kpis.totalBookings.changePercent}
            icon={FileText}
            iconBgClassName="bg-sky-500"
          />
        </TrendCardLink>
        <DashboardTrendStatCard
          title="Occupancy rate"
          value={`${kpis.occupancyRate.value}%`}
          change={kpis.occupancyRate.changePoints}
          changeLabel="pts"
          changeIsPoints
          icon={Percent}
          iconBgClassName="bg-violet-500"
        />
        <DashboardTrendStatCard
          title="Average nightly rate"
          value={formatMoney(kpis.avgNightlyRate.value)}
          change={kpis.avgNightlyRate.changePercent}
          icon={BedDouble}
          iconBgClassName="bg-amber-500"
        />
        <DashboardTrendStatCard
          title="Total guests"
          value={String(kpis.totalGuests.value)}
          change={kpis.totalGuests.changePercent}
          icon={Users}
          iconBgClassName="bg-indigo-500"
        />
      </div>
    </section>
  );
}
