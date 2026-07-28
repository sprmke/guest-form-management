import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FinanceChartCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: Props) {
  return (
    <section className={cn('surface-card flex min-w-0 flex-col p-3 sm:p-4', className)}>
      <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="icon-well-sm shrink-0">
            <Icon className="text-muted-foreground size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-foreground text-lg font-semibold tracking-tight">{title}</p>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
