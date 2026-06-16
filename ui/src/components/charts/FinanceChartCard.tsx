import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
    <section className={cn('flex flex-col p-3 min-w-0 surface-card sm:p-4', className)}>
      <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2 items-start min-w-0">
          <div className="icon-well-sm shrink-0 bg-muted/80">
            <Icon className="size-[18px] text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-section-title text-foreground">
              {title}
            </p>
            <p className="text-caption">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
