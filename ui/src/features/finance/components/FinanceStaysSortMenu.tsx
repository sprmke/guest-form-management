import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinanceQuery } from '@/features/finance/lib/types';

const SORT_OPTIONS: { value: FinanceQuery['sort']; label: string }[] = [
  { value: 'check_in_date:desc', label: 'Newest first' },
  { value: 'check_in_date:asc', label: 'Oldest first' },
  { value: 'host_net:desc', label: 'Net ↓' },
  { value: 'host_net:asc', label: 'Net ↑' },
];

type Props = {
  sort: FinanceQuery['sort'];
  onChange: (sort: FinanceQuery['sort']) => void;
  fullWidth?: boolean;
};

export function FinanceStaysSortMenu({
  sort,
  onChange,
  fullWidth = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort';

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
    <div ref={ref} className={cn('relative min-w-0', fullWidth && 'w-full')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold',
          'border transition-all duration-100 whitespace-nowrap select-none lg:min-h-0',
          fullWidth && 'w-full justify-center',
          open
            ? 'interactive-primary border-primary'
            : 'border-sidebar-border bg-card text-sidebar-foreground hover:border-primary/40 hover:bg-primary/5',
        )}
      >
        <ArrowUpDown className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
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
          role="listbox"
          aria-label="Sort stays"
          className="absolute right-0 z-50 mt-1.5 w-[min(calc(100vw-24px),12rem)] overflow-hidden rounded-xl border border-border/50 bg-popover shadow-elevated-lg dark:border-border/20"
        >
          <div className="py-1">
            {SORT_OPTIONS.map((opt) => {
              const selected = sort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] transition-colors',
                    selected
                      ? 'bg-muted/50 font-semibold text-foreground'
                      : 'font-medium text-foreground/80 hover:bg-muted/50',
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">{opt.label}</span>
                  {selected && (
                    <Check
                      className="size-3.5 shrink-0 text-primary"
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
