import {
  Bell,
  CheckCircle2,
  Clock3,
  ListChecks,
  Wrench,
} from "lucide-react";
import { FinanceOverviewSkeleton } from "@/components/skeletons/AdminSkeletons";
import { FinanceKpiCard } from "@/features/finance/components/FinanceKpiCard";
import type { MaintenanceSummary } from "@/features/maintenance/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  summary: MaintenanceSummary | undefined;
  isLoading: boolean;
};

export function MaintenanceOverviewTab({ summary, isLoading }: Props) {
  if (isLoading && !summary) {
    return <FinanceOverviewSkeleton />;
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center surface-card">
        <div className="icon-well-sm bg-muted/80">
          <Wrench className="size-[18px] text-muted-foreground" aria-hidden />
        </div>
        <p className="font-bold text-section-title text-foreground">
          No data for this period
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FinanceKpiCard
            label="Total"
            value={String(summary.total)}
            icon={ListChecks}
            iconBgClassName="bg-teal-500"
          />
          <FinanceKpiCard
            label="Telegram enabled"
            value={String(summary.telegramEnabled)}
            icon={Bell}
            iconBgClassName="bg-sky-500"
          />
          <FinanceKpiCard
            label="Completed"
            value={String(summary.completed)}
            icon={CheckCircle2}
            iconBgClassName="bg-emerald-500"
            valueClassName="text-emerald-700 dark:text-emerald-300"
          />
          <FinanceKpiCard
            label="Pending"
            value={String(summary.pending)}
            icon={Clock3}
            iconBgClassName="bg-amber-500"
            valueClassName={cn(
              summary.pending > 0
                ? "text-amber-700 dark:text-amber-300"
                : undefined,
            )}
          />
        </div>
      </section>

      {summary.byCategory.length > 0 ? (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-separator px-3 py-2.5 sm:px-4">
            <p className="text-overline">By category</p>
          </div>
          <ul className="divide-y divide-separator">
            {summary.byCategory.map((row) => (
              <li
                key={row.category}
                className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4"
              >
                <span className="truncate text-sm font-semibold text-foreground">
                  {row.category}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
