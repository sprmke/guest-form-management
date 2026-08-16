import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

type Props = {
  icon?: LucideIcon;
  title: string;
  /** Desktop-only supporting line — hidden below `lg`. */
  description?: string;
  action?: ReactNode;
  className?: string;
  iconClassName?: string;
};

/**
 * Title row for admin surface cards (charts, calendar, transactions, …).
 * Mobile/tablet: compact icon well + vertically centered title (no subtitle).
 * Desktop: larger well; start-aligned when a description is present.
 */
export function AdminSurfaceCardHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
}: Props) {
  return (
    <div
      className={cn(
        'mb-2.5 flex shrink-0 flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3',
        description ? 'lg:mb-3.5 lg:items-start' : null,
        className
      )}
    >
      <div
        className={cn(
          'flex min-w-0 gap-2.5',
          /* Center through tablet — description only appears at lg. */
          description ? 'items-center lg:items-start' : 'items-center'
        )}
      >
        {Icon ? (
          <div
            className={cn(
              /* `!size` / `!rounded` beat `.icon-well-sm` h/w in the same utilities layer */
              'icon-well-sm inline-flex !size-8 shrink-0 items-center justify-center !rounded-lg lg:!size-10 lg:!rounded-xl',
              iconClassName
            )}
          >
            <Icon className="text-muted-foreground size-4 lg:size-5" aria-hidden />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-section-title leading-none lg:text-lg lg:leading-snug">{title}</p>
          {description ? (
            <p className="text-muted-foreground mt-1 hidden text-xs leading-snug lg:block">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div className="shrink-0 self-start sm:self-center lg:self-start">{action}</div>
      ) : null}
    </div>
  );
}
