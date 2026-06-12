import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  className?: string;
};

export function DashboardSimpleStatCard({
  title,
  value,
  subtext,
  icon: Icon,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-3.5 sm:p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="truncate text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          {subtext ? (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          ) : null}
        </div>
        <Icon
          className="size-8 shrink-0 text-muted-foreground/70"
          aria-hidden
        />
      </div>
    </div>
  );
}
