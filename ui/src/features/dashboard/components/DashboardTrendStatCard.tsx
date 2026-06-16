import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  /** When true, `change` is shown as percentage points (e.g. occupancy). */
  changeIsPoints?: boolean;
  icon: LucideIcon;
  iconBgClassName: string;
  valueClassName?: string;
  className?: string;
};

function formatChange(change: number, isPoints: boolean): string {
  const sign = change > 0 ? "+" : "";
  if (isPoints) return `${sign}${Math.round(change)}%`;
  return `${sign}${Math.round(change)}%`;
}

export function DashboardTrendStatCard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  changeIsPoints = false,
  icon: Icon,
  iconBgClassName,
  valueClassName,
  className,
}: Props) {
  const hasChange = change !== undefined;
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-3.5 transition-all duration-300 sm:p-4",
        "hover:-translate-y-0.5 hover:shadow-elevated",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "truncate text-2xl font-bold tracking-tight tabular-nums text-foreground",
              valueClassName,
            )}
          >
            {value}
          </p>
          {hasChange ? (
            <div className="space-y-1">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="size-3" aria-hidden />
                ) : (
                  <TrendingDown className="size-3" aria-hidden />
                )}
                {formatChange(change, changeIsPoints)}
              </span>
              <p className="text-xs text-muted-foreground">{changeLabel}</p>
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 sm:size-11 sm:rounded-2xl",
            iconBgClassName,
          )}
        >
          <Icon className="size-5 text-white" aria-hidden />
        </div>
      </div>
    </div>
  );
}
