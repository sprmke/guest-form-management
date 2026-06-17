import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BOOKINGS_SORT_OPTIONS,
  bookingsSortButtonLabel,
} from '@/features/admin/lib/bookingsSortOptions';
import type { BookingsSort } from '@/features/admin/lib/types';

type Props = {
  sort: BookingsSort;
  onChange: (sort: BookingsSort) => void;
  className?: string;
  /** Full-width trigger (mobile toolbar). Desktop uses compact inline width. */
  fullWidth?: boolean;
};

export function BookingsSortMenu({
  sort,
  onChange,
  className,
  fullWidth = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold',
          'border transition-all duration-100 whitespace-nowrap select-none',
          fullWidth && 'w-full justify-center',
          open
            ? 'interactive-primary border-primary'
            : 'border-sidebar-border bg-card text-sidebar-foreground hover:border-primary/40 hover:bg-primary/5',
        )}
      >
        <ArrowUpDown className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{bookingsSortButtonLabel(sort)}</span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-150',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-border/50 dark:border-border/20 bg-popover shadow-elevated-lg sm:left-0 sm:right-auto sm:w-80',
            'max-w-[calc(100vw-24px)]',
          )}
        >
          <div className="border-b border-separator px-3.5 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Sort by
            </span>
          </div>
          <div className="py-1 max-h-[min(60vh,280px)] overflow-y-auto">
            {BOOKINGS_SORT_OPTIONS.map((opt) => {
              const isSelected = opt.value === sort;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors',
                    isSelected ? 'bg-muted/50' : 'hover:bg-muted/50',
                  )}
                >
                  <ArrowUpDown
                    className={cn(
                      'mt-0.5 size-3.5 shrink-0',
                      isSelected ? 'text-sidebar-primary' : 'text-muted-foreground',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-[13px]',
                        isSelected
                          ? 'font-semibold text-foreground'
                          : 'font-medium text-foreground/75',
                      )}
                    >
                      {opt.label}
                    </span>
                    {opt.description ? (
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {opt.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected && (
                    <Check
                      className="mt-0.5 ml-auto size-3.5 shrink-0 text-sidebar-primary"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
