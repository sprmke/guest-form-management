import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookingDateRangeFilter } from '@/features/admin/components/BookingDateRangeFilter';
import type { DateNavigationState } from '@/lib/dateNavigation';
import type { FinancePeriodBasis, FinanceQuery } from '@/features/finance/lib/types';

const BASIS_OPTIONS: { value: FinancePeriodBasis; label: string }[] = [
  { value: 'completed', label: 'Completed date' },
  { value: 'check_in', label: 'Check-in date' },
  { value: 'check_out', label: 'Check-out date' },
];

type Props = {
  query: FinanceQuery;
  onChange: (next: FinanceQuery) => void;
  showStaysSearch?: boolean;
  dateNav: DateNavigationState;
  onClearDate: () => void;
};

export function FinancePeriodToolbar({
  query,
  onChange,
  showStaysSearch = false,
  dateNav,
  onClearDate,
}: Props) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(query.q);
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
    if (!optionsOpen) return;
    function onDoc(e: MouseEvent) {
      if (!optionsRef.current?.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [optionsOpen]);

  return (
    <div className="flex flex-col gap-2 px-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      <BookingDateRangeFilter
        {...dateNav}
        isActive={isDateActive}
        onClear={onClearDate}
      />

      {showStaysSearch && (
        <div className="relative order-last w-full sm:order-none sm:min-w-[180px] sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search guest…"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          {searchDraft && (
            <button
              type="button"
              className="absolute right-1 top-1/2 flex min-h-[36px] min-w-[36px] -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
              onClick={() => setSearchDraft('')}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 sm:ml-auto">
        <Select
          value={query.basis}
          onValueChange={(v) =>
            onChange({
              ...query,
              page: 1,
              basis: v as FinancePeriodBasis,
              completedOnly:
                v === 'completed' ? false : query.completedOnly,
            })
          }
        >
          <SelectTrigger className="h-9 w-[10rem] text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BASIS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative" ref={optionsRef}>
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            className={cn(
              'inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-lg border px-2 transition-colors',
              extraFilters > 0 || optionsOpen
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50',
            )}
            aria-expanded={optionsOpen}
            aria-label="Filter options"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {extraFilters > 0 && (
              <span className="flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {extraFilters}
              </span>
            )}
          </button>
          {optionsOpen && (
            <div className="absolute right-0 z-50 mt-1.5 w-[min(calc(100vw-24px),16rem)] rounded-xl border border-border bg-popover py-2 shadow-elevated-lg">
              <div className="px-3 pt-1">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Visibility
                </p>
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
                    <span className="text-sm text-foreground">
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
                  <span className="text-sm text-foreground">
                    Include cancelled
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
