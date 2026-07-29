import type { ReactNode } from 'react';


import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

type BookingDetailCardProps = {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  /** 'edit' applies the primary-tinted header used while editing a section. */
  tone?: 'default' | 'edit';
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/**
 * Shared card shell for the booking detail page — used by both view panels
 * and edit-mode tabs so the two states share one visual language.
 */
export function BookingDetailCard({
  title,
  icon: Icon,
  action,
  tone = 'default',
  children,
  className,
  bodyClassName,
}: BookingDetailCardProps) {
  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      <div
        className={cn(
          'border-border/70 flex items-center gap-2.5 border-b px-4 py-3.5 sm:px-5',
          tone === 'edit' ? 'bg-primary/[0.04]' : 'bg-muted/25'
        )}
      >
        {Icon ? (
          <span className="icon-well-sm size-8 shrink-0 sm:size-9">
            <Icon className="text-primary size-4" />
          </span>
        ) : null}
        <h3 className="text-card-title min-w-0 flex-1 truncate !text-sm sm:!text-base">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('px-4 sm:px-5', bodyClassName)}>{children}</div>
    </Card>
  );
}
