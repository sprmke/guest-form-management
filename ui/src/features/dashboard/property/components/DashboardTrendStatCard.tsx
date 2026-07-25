import { StatCard, type StatCardProps } from '@/components/shared/StatCard';

import type { LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  changeIsPoints?: boolean;
  icon: LucideIcon;
  iconClassName?: string;
  iconBgClassName: string;
  valueClassName?: string;
  className?: string;
};

export function DashboardTrendStatCard(props: Props) {
  return <StatCard {...(props as StatCardProps)} />;
}
