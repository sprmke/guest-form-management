import type { FinanceLedgerStatus } from '@/features/dashboard/finance/lib/types';

import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<FinanceLedgerStatus, { label: string; className: string }> = {
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  canceled: {
    label: 'Canceled',
    className: 'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  },
};

type Props = {
  status: FinanceLedgerStatus;
  className?: string;
};

export function FinanceLedgerStatusBadge({ status, className }: Props) {
  const config = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
