import type { LucideIcon } from "lucide-react";
import {
  AdminMetricCard,
  type AdminMetricCardProps,
} from "@/features/admin/components/AdminMetricCard";

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

export function DashboardTrendStatCard(props: Props) {
  return <AdminMetricCard {...(props as AdminMetricCardProps)} />;
}
