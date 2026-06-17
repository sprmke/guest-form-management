import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type AdminMetricCardProps = {
  title: string;
  value: string;
  icon?: LucideIcon;
  iconBgClassName?: string;
  valueClassName?: string;
  className?: string;
  change?: number;
  changeLabel?: string;
  /** When true, `change` is shown as percentage points (e.g. occupancy). */
  changeIsPoints?: boolean;
};

function formatChange(change: number, isPoints: boolean): string {
  const sign = change > 0 ? "+" : "";
  if (isPoints) return `${sign}${Math.round(change)}%`;
  return `${sign}${Math.round(change)}%`;
}

export function AdminMetricCard({
  title,
  value,
  icon: Icon,
  iconBgClassName,
  valueClassName,
  className,
  change,
  changeLabel = "vs last period",
  changeIsPoints = false,
}: AdminMetricCardProps) {
  const hasChange = change !== undefined;
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "surface-card group relative p-3.5 sm:p-4",
        "hover:shadow-elevated-lg motion-safe:transition-shadow motion-safe:duration-200",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "truncate text-xl font-bold tracking-tight tabular-nums text-foreground",
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
        {Icon && iconBgClassName ? (
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 sm:size-9",
              iconBgClassName,
            )}
          >
            <Icon className="size-4 text-white" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}

type AdminMetricCardSkeletonProps = {
  showTrend?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function AdminMetricCardSkeleton({
  showTrend = false,
  className,
  style,
}: AdminMetricCardSkeletonProps) {
  return (
    <div
      className={cn(
        "surface-card p-3.5 sm:p-4",
        className,
      )}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          {showTrend ? (
            <div className="space-y-1 pt-0.5">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ) : null}
        </div>
        <Skeleton className="size-8 shrink-0 rounded-lg sm:size-9" />
      </div>
    </div>
  );
}
