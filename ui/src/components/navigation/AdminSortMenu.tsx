import { useRef, useState } from 'react';

import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';

import { useDismissOnOutsideClick } from '@/hooks/useDismissOnOutsideClick';

import { cn } from '@/lib/utils';

export type AdminSortOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type Props<T extends string> = {
  sort: T;
  onChange: (sort: T) => void;
  options: readonly AdminSortOption<T>[];
  ariaLabel: string;
  fullWidth?: boolean;
  menuWidthClass?: string;
  resolveLabel?: (sort: T, options: readonly AdminSortOption<T>[]) => string;
};

export function AdminSortMenu<T extends string>({
  sort,
  onChange,
  options,
  ariaLabel,
  fullWidth = false,
  menuWidthClass = 'w-[min(calc(100vw-24px),14rem)]',
  resolveLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label =
    resolveLabel?.(sort, options) ??
    options.find((option) => option.value === sort)?.label ??
    'Sort';

  useDismissOnOutsideClick(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className={cn('relative min-w-0', fullWidth && 'w-full')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold',
          'select-none whitespace-nowrap border transition-all duration-100 lg:min-h-0',
          fullWidth && 'w-full justify-center',
          open
            ? 'interactive-primary border-border'
            : 'border-border bg-card text-foreground hover:bg-muted/60'
        )}
      >
        <ArrowUpDown className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-150',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'border-border/50 bg-popover shadow-elevated-lg dark:border-border/20 absolute left-0 z-50 mt-1.5 overflow-hidden rounded-xl border',
            menuWidthClass
          )}
        >
          <div className="py-1">
            {options.map((option) => {
              const selected = sort === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors',
                    selected
                      ? 'bg-muted/50 text-foreground font-semibold'
                      : 'text-foreground/80 hover:bg-muted/50 font-medium'
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px]">{option.label}</span>
                    {option.description ? (
                      <span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <Check className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
