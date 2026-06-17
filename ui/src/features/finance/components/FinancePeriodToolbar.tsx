import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsBelowMd, useIsBelowXl } from '@/hooks/useMediaQuery';
import { BookingDateRangeFilter } from '@/features/admin/components/BookingDateRangeFilter';
import type { DateNavigationState } from '@/lib/dateNavigation';
import type { FinancePeriodBasis, FinanceQuery } from '@/features/finance/lib/types';

const BASIS_OPTIONS: { value: FinancePeriodBasis; label: string }[] = [
  { value: 'completed', label: 'Completed date' },
  { value: 'check_in', label: 'Check-in date' },
  { value: 'check_out', label: 'Check-out date' },
];

function basisLabel(value: FinancePeriodBasis): string {
  return BASIS_OPTIONS.find((o) => o.value === value)?.label ?? 'Period basis';
}

type Props = {
  query: FinanceQuery;
  onChange: (next: FinanceQuery) => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  dateNav: DateNavigationState;
  onClearDate: () => void;
  /** Filters sit on the right beside tabs (Finance controls card). */
  align?: 'start' | 'end';
  /** Hide period/search controls (Settings tab). */
  hideDateFilter?: boolean;
};

export function FinancePeriodToolbar({
  query,
  onChange,
  showSearch = false,
  searchPlaceholder = 'Search…',
  dateNav,
  onClearDate,
  align = 'end',
  hideDateFilter = false,
}: Props) {
  const isBelowMd = useIsBelowMd();
  const isBelowXl = useIsBelowXl();
  const [basisOpen, setBasisOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(query.q);
  const basisRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const searchMount = useRef(true);

  const isDateActive = !!(query.from || query.to);
  const extraFilters =
    (query.completedOnly && query.basis !== 'completed' ? 1 : 0) +
    (query.includeCancelled ? 1 : 0);

  useEffect(() => {
    if (searchMount.current) {
      searchMount.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      if (searchDraft !== query.q) {
        onChange({ ...query, page: 1, q: searchDraft });
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchDraft, query, onChange]);

  useEffect(() => {
    setSearchDraft(query.q);
  }, [query.q]);

  useEffect(() => {
    if (!basisOpen && !optionsOpen) return;
    function onDoc(e: MouseEvent) {
      if (!basisRef.current?.contains(e.target as Node)) {
        setBasisOpen(false);
      }
      if (!optionsRef.current?.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [basisOpen, optionsOpen]);

  const filterCluster = (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5',
        isBelowMd ? 'w-full min-w-0' : 'flex-wrap',
      )}
    >
      <div
        className={cn(
          'relative min-w-0',
          isBelowMd ? 'min-w-0 flex-1' : 'max-w-full shrink-0',
        )}
        ref={basisRef}
      >
        <button
          type="button"
          onClick={() => setBasisOpen((v) => !v)}
          aria-expanded={basisOpen}
          aria-haspopup="listbox"
          className={cn(
            'inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-lg border px-3 py-2.5 text-[13px] font-semibold',
            'transition-all duration-100',
            isBelowMd ? 'w-full justify-between' : 'justify-between sm:justify-start',
            basisOpen
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/60',
          )}
        >
          <span className="truncate">{basisLabel(query.basis)}</span>
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 transition-transform duration-150',
              basisOpen && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
        {basisOpen && (
          <div
            role="listbox"
            aria-label="Period basis"
            className="absolute right-0 z-50 mt-1.5 w-[min(calc(100vw-24px),12rem)] overflow-hidden rounded-xl border border-border/50 bg-popover shadow-elevated-lg dark:border-border/20"
          >
            <div className="py-1">
              {BASIS_OPTIONS.map((opt) => {
                const selected = query.basis === opt.value;
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
                      onChange({
                        ...query,
                        page: 1,
                        basis: opt.value,
                        completedOnly:
                          opt.value === 'completed'
                            ? false
                            : query.completedOnly,
                      });
                      setBasisOpen(false);
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

      <div className="relative shrink-0" ref={optionsRef}>
        <button
          type="button"
          onClick={() => setOptionsOpen((v) => !v)}
          className={cn(
            'relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border transition-colors',
            extraFilters > 0 || optionsOpen
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/60',
          )}
          aria-expanded={optionsOpen}
          aria-label="Filter options"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {extraFilters > 0 && (
            <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full gradient-primary text-[10px] font-bold text-primary-foreground">
              {extraFilters}
            </span>
          )}
        </button>
        {optionsOpen && (
          <div className="absolute right-0 z-50 mt-1.5 w-[min(calc(100vw-24px),16rem)] rounded-xl border border-border bg-popover py-2 shadow-elevated-lg">
            <div className="px-3 pt-1">
              <p className="mb-1.5 text-overline">Visibility</p>
              {query.basis !== 'completed' && (
                <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input text-primary focus:ring-primary"
                    checked={query.completedOnly}
                    onChange={(e) =>
                      onChange({
                        ...query,
                        page: 1,
                        completedOnly: e.target.checked,
                      })
                    }
                  />
                  <span className="text-[13px] text-foreground">
                    Completed only
                  </span>
                </label>
              )}
              <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input text-primary focus:ring-primary"
                  checked={query.includeCancelled}
                  onChange={(e) =>
                    onChange({
                      ...query,
                      page: 1,
                      includeCancelled: e.target.checked,
                    })
                  }
                />
                <span className="text-[13px] text-foreground">
                  Include cancelled
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (hideDateFilter) return null;

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-2.5',
        'xl:flex-row xl:items-center xl:gap-2',
        align === 'end' && 'xl:justify-end',
        align === 'start' && 'xl:justify-start',
      )}
    >
      {showSearch && (
        <div className="relative w-full min-w-0 xl:max-w-[24rem] xl:flex-1 2xl:max-w-[28rem]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            placeholder={searchPlaceholder}
            className={cn(
              'h-10 min-h-[44px] w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 text-[13px] text-foreground',
              searchDraft ? 'pr-11' : 'pr-3',
              'placeholder:text-muted-foreground',
              'transition-all duration-150',
              'focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20',
            )}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          {searchDraft && (
            <button
              type="button"
              className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
              onClick={() => setSearchDraft('')}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          'flex w-full min-w-0 flex-col gap-2',
          'sm:flex-row sm:flex-wrap sm:items-center sm:gap-2',
          'xl:w-auto xl:shrink-0 xl:flex-nowrap',
        )}
      >
        <div
          className={cn(
            'min-w-0',
            isBelowMd || isBelowXl ? 'w-full' : 'shrink-0',
          )}
        >
          <BookingDateRangeFilter
            {...dateNav}
            isActive={isDateActive}
            onClear={onClearDate}
            fullWidth={isBelowMd || isBelowXl}
          />
        </div>

        {filterCluster}
      </div>
    </div>
  );
}
