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

  // Debounced search
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

  // Close options on outside click
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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      {/* Date range picker */}
      <BookingDateRangeFilter
        {...dateNav}
        isActive={isDateActive}
        onClear={onClearDate}
      />

      {/* Search — stays tab only, grows to fill available space */}
      {showStaysSearch && (
        <div className="relative order-last w-full sm:order-none sm:min-w-[180px] sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search guest…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          {searchDraft && (
            <button
              type="button"
              className="absolute right-1 top-1/2 flex min-h-[36px] min-w-[36px] -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
              onClick={() => setSearchDraft('')}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Right group — pushed to end */}
      <div className="flex items-center gap-2 sm:ml-auto">
        {/* Basis dropdown */}
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
          <SelectTrigger className="h-9 w-[10rem] border-slate-200 text-xs font-semibold">
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

        {/* Options dropdown */}
        <div className="relative" ref={optionsRef}>
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            className={cn(
              'inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-lg border px-2 transition-colors',
              extraFilters > 0 || optionsOpen
                ? 'border-teal-600 bg-teal-50 text-teal-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            )}
            aria-expanded={optionsOpen}
            aria-label="Filter options"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {extraFilters > 0 && (
              <span className="flex size-[18px] items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">
                {extraFilters}
              </span>
            )}
          </button>
          {optionsOpen && (
            <div className="absolute right-0 z-50 mt-1.5 w-[min(calc(100vw-24px),16rem)] rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
              <div className="px-3 pt-1">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Visibility
                </p>
                {query.basis !== 'completed' && (
                  <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                      checked={query.completedOnly}
                      onChange={(e) =>
                        onChange({
                          ...query,
                          page: 1,
                          completedOnly: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm text-slate-700">
                      Completed only
                    </span>
                  </label>
                )}
                <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                    checked={query.includeCancelled}
                    onChange={(e) =>
                      onChange({
                        ...query,
                        page: 1,
                        includeCancelled: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-slate-700">
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
