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
  /**
   * `compact` — title row + actions on one line (Bookings, Finance).
   * Typography matches `default` on all breakpoints.
   */
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
          ? 'flex flex-row items-center justify-between gap-3'
          : 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        compact && !rowWithActions && 'sm:items-center',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <Icon
              className="size-4 shrink-0 text-primary sm:size-[18px]"
              aria-hidden
            />
          ) : null}
          <h1 id={id} className="text-admin-page-title">
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p className="max-w-prose text-admin-page-subtitle">{subtitle}</p>
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
