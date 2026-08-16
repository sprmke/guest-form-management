import type { ReactNode } from 'react';

import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

type GuestAccountEmptyStateProps = {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  children?: ReactNode;
};

export function GuestAccountEmptyState({
  message,
  actionLabel,
  actionHref,
  className,
  children,
}: GuestAccountEmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-card flex w-full flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center shadow-sm sm:py-20',
        className
      )}
    >
      <p className="text-muted-foreground text-sm">{message}</p>
      {actionLabel && actionHref ? (
        <Link
          to={actionHref}
          className="text-primary mt-4 inline-flex min-h-[44px] items-center text-sm font-medium"
        >
          {actionLabel}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
