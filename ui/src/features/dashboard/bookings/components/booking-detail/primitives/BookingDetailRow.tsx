import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Wraps a group of `BookingDetailRow`s with the divider treatment. */
export function BookingDetailRowGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('divide-border/60 divide-y', className)}>{children}</div>;
}

/** PMS-style label ↔ value row for view mode (not a form field). */
export function BookingDetailRow({
  label,
  value,
  icon,
  children,
  className,
}: {
  label: string;
  value?: string | number | null;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== '' && value !== '—';
  if (!hasValue && !children) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-1 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className
      )}
    >
      <span className="text-muted-foreground shrink-0 text-xs font-medium">{label}</span>
      {children ?? (
        <span className="text-foreground flex min-w-0 items-center justify-end gap-1.5 text-right text-sm font-semibold leading-snug sm:max-w-[68%]">
          {icon}
          <span className="min-w-0 break-words">{String(value)}</span>
        </span>
      )}
    </div>
  );
}

export function BookingDetailRowBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('py-3.5', className)}>{children}</div>;
}
