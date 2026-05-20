import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isStaySort,
  nextStaySort,
} from '@/features/admin/lib/bookingsListSort';
import type { BookingsSort } from '@/features/admin/lib/types';

type Props = {
  sort: BookingsSort;
  onChange: (next: BookingsSort) => void;
  /** `header` = table column; `bar` = compact control above card grid */
  variant?: 'header' | 'bar';
  className?: string;
};

export function BookingStaySortControl({
  sort,
  onChange,
  variant = 'header',
  className,
}: Props) {
  const active = isStaySort(sort);
  const direction = sort === 'check_in_date:desc' ? 'desc' : 'asc';

  const Icon = active
    ? direction === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  const label = active
    ? direction === 'asc'
      ? 'Stay: earliest check-in first'
      : 'Stay: latest check-in first'
    : 'Sort by stay dates';

  if (variant === 'bar') {
    return (
      <button
        type="button"
        onClick={() => onChange(nextStaySort(sort))}
        aria-label={label}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold min-h-[44px]',
          'border transition-all duration-100 whitespace-nowrap',
          active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary'
            : 'bg-white text-sidebar-foreground border-sidebar-border hover:border-sidebar-primary/40 hover:bg-sidebar-accent/50',
          className,
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden />
        Stay
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onChange(nextStaySort(sort))}
      aria-label={label}
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      className={cn(
        'inline-flex items-center gap-1 min-h-[44px] -my-2 py-2',
        'text-[10px] font-bold uppercase tracking-[0.1em]',
        active ? 'text-sidebar-primary' : 'text-slate-400 hover:text-slate-600',
        'transition-colors',
        className,
      )}
    >
      Stay
      <Icon className="size-3 shrink-0" aria-hidden />
    </button>
  );
}
