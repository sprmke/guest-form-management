import type { LucideIcon } from "lucide-react";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";

type Props = {
  label: string;
  value: string;
  icon?: LucideIcon;
  iconBgClassName?: string;
  valueClassName?: string;
  className?: string;
};

export function FinanceKpiCard({
  label,
  value,
  icon,
  iconBgClassName,
  valueClassName,
  className,
}: Props) {
  return (
    <AdminMetricCard
      title={label}
      value={value}
      icon={icon}
      iconBgClassName={iconBgClassName}
      valueClassName={valueClassName}
      className={className}
    />
  );
}
