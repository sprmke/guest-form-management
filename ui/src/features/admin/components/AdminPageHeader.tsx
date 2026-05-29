import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** Optional classes on the actions wrapper. */
  actionsClassName?: string;
  className?: string;
  id?: string;
  /** Dense toolbar-style header (bookings list). Other pages use default in-card sizing. */
  variant?: 'default' | 'compact';
};

export function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  actionsClassName,
  className,
  id,
  variant = 'default',
}: AdminPageHeaderProps) {
  const compact = variant === 'compact';

  const rowWithActions = compact && actions;

  return (
    <div
      className={cn(
        rowWithActions
          ? 'flex flex-row items-center justify-between gap-2'
          : 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        compact && !rowWithActions && 'sm:items-center',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          {Icon ? (
            <Icon
              className={cn(
                'shrink-0 text-primary',
                compact ? 'size-3.5' : 'size-4',
              )}
              aria-hidden
            />
          ) : null}
          <h1
            id={id}
            className={
              compact
                ? 'text-base font-bold text-foreground lg:text-[14px]'
                : 'text-card-title'
            }
          >
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p
            className={cn(
              'max-w-prose',
              compact
                ? 'text-xs leading-snug text-muted-foreground lg:text-[11px]'
                : 'text-caption',
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            'flex shrink-0 items-center gap-1.5',
            actionsClassName,
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
