import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BOOKING_STATUSES,
  LEGACY_BOOKING_STATUSES,
  statusLabel,
} from '@/features/admin/lib/bookingStatus';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { BookingDateRangeFilter } from '@/features/admin/components/BookingDateRangeFilter';
import type { DateNavigationState } from '@/lib/dateNavigation';
import type { BookingsQuery, BookingsSort } from '@/features/admin/lib/types';

const SORT_OPTIONS: { value: BookingsSort; label: string }[] = [
  { value: 'check_in_date:asc', label: 'Check-in ↑ (earliest first)' },
  { value: 'check_in_date:desc', label: 'Check-in ↓ (latest first)' },
  { value: 'created_at:desc', label: 'Submitted ↓ (newest first)' },
  { value: 'created_at:asc', label: 'Submitted ↑ (oldest first)' },
];

type Props = {
  query: BookingsQuery;
  onChange: (patch: Partial<BookingsQuery>) => void;
  onReset: () => void;
  /** Date navigation state (presets + custom range) shared with parent. */
  dateNav: DateNavigationState;
  /** Clear the date filter — sets `from`/`to` to null and resets preset. */
  onClearDate: () => void;
};

const ALL_STATUSES = [...BOOKING_STATUSES, ...LEGACY_BOOKING_STATUSES];

// ─── Shared filter button ──────────────────────────────────
function FilterBtn({
  label,
  count = 0,
  isOpen,
  onClick,
}: {
  label: string;
  count?: number;
  isOpen: boolean;
  onClick: () => void;
}) {
  const active = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold',
        'border transition-all duration-100 whitespace-nowrap select-none min-h-[44px]',
        active || isOpen
          ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary'
          : 'bg-white text-sidebar-foreground border-sidebar-border hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
      )}
    >
      {label}
      {active && (
        <span
          className={cn(
            'inline-flex justify-center items-center px-1 font-black rounded-full min-w-[18px] h-[18px] text-[10px]',
            'text-white bg-white/20',
          )}
        >
          {count}
        </span>
      )}
      <ChevronDown
        className={cn(
          'size-3.5 shrink-0 transition-transform duration-150',
          isOpen && 'rotate-180',
        )}
        aria-hidden
      />
    </button>
  );
}

// ─── Dropdown panel shell ──────────────────────────────────
function DropdownPanel({
  children,
  width = 'w-64',
}: {
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div
      className={cn(
        // max-w-[calc(100vw-24px)] prevents the panel from overflowing the viewport on mobile.
        // The panel anchors left-0 and won't extend past the screen edge.
        'absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl overflow-hidden',
        'max-w-[calc(100vw-24px)]',
        width,
      )}
      style={{
        border: '1px solid rgba(0,0,0,0.09)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {children}
    </div>
  );
}

// ─── Main filter component ─────────────────────────────────
export function BookingFilters({
  query,
  onChange,
  onReset,
  dateNav,
  onClearDate,
}: Props) {
  const [draft, setDraft] = useState(query.q);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstMount = useRef(true);

  // Sync draft when URL changes (e.g. browser back)
  useEffect(() => {
    setDraft(query.q);
  }, [query.q]);

  // Debounce search
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (draft !== query.q) onChange({ q: draft, page: 1 });
    }, 280);
    return () => clearTimeout(t);
  }, [draft, query.q, onChange]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpenKey(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => setOpenKey((k) => (k === key ? null : key));

  const activeStatuses = new Set(query.status);
  const toggleStatus = (v: string) => {
    const next = new Set(activeStatuses);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange({ status: Array.from(next), page: 1 });
  };

  const isDateActive = Boolean(query.from || query.to);

  const totalActiveFilters =
    (query.q ? 1 : 0) +
    query.status.length +
    (query.hasPets !== null ? 1 : 0) +
    (query.needParking !== null ? 1 : 0) +
    (query.includeTests ? 1 : 0) +
    (isDateActive ? 1 : 0);

  const isDirty = totalActiveFilters > 0;

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl"
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex flex-col sm:flex-row gap-2 px-3 py-2.5">
        {/* ── Search ──────────────────────────────────── */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none size-4 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search guests, email, phone, plate, pet, notes…"
            aria-label="Search bookings"
            className={cn(
              'pr-8 pl-9 w-full rounded-lg py-[7px] text-[13px] text-slate-700',
              'border bg-slate-50 border-slate-200',
              'placeholder:text-slate-400',
              'focus:outline-none focus:border-sidebar-primary focus:ring-2 focus:ring-sidebar-ring/20 focus:bg-white',
              'transition-all duration-150',
            )}
          />
          {draft && (
            <button
              type="button"
              onClick={() => setDraft('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* ── Filter buttons — wrap on mobile to avoid overflow-x clipping dropdowns ── */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {/* Divider (desktop only) */}
          <div className="hidden sm:block w-px h-5 bg-slate-200 shrink-0 mx-0.5" />

          {/* — Sort dropdown — */}
          <div className="relative shrink-0">
            <FilterBtn
              label={
                (SORT_OPTIONS.find((o) => o.value === query.sort)?.label.split(
                  ' ',
                )[0] ?? 'Sort') +
                ' ' +
                (query.sort.endsWith(':asc') ? '↑' : '↓')
              }
              count={0}
              isOpen={openKey === 'sort'}
              onClick={() => toggle('sort')}
            />
            {openKey === 'sort' && (
              <DropdownPanel width="w-64">
                <div
                  className="px-3.5 py-2.5"
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Sort by
                  </span>
                </div>
                <div className="py-1">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = opt.value === query.sort;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange({ sort: opt.value, page: 1 });
                          setOpenKey(null);
                        }}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3.5 py-2 text-left transition-colors',
                          isSelected ? 'bg-slate-50' : 'hover:bg-slate-50',
                        )}
                      >
                        <ArrowUpDown
                          className={cn(
                            'size-3.5 shrink-0',
                            isSelected
                              ? 'text-sidebar-primary'
                              : 'text-slate-300',
                          )}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            'text-[13px]',
                            isSelected
                              ? 'font-semibold text-slate-800'
                              : 'font-medium text-slate-600',
                          )}
                        >
                          {opt.label}
                        </span>
                        {isSelected && (
                          <Check
                            className="ml-auto size-3.5 text-sidebar-primary shrink-0"
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </DropdownPanel>
            )}
          </div>

          {/* — Date range — presets (week/month/year) + custom calendar — */}
          <BookingDateRangeFilter
            {...dateNav}
            isActive={isDateActive}
            onClear={onClearDate}
          />

          {/* — Status dropdown — */}
          <div className="relative shrink-0">
            <FilterBtn
              label="Status"
              count={query.status.length}
              isOpen={openKey === 'status'}
              onClick={() => toggle('status')}
            />
            {openKey === 'status' && (
              <DropdownPanel width="w-72">
                {/* Header */}
                <div
                  className="flex items-center justify-between px-3.5 py-2.5"
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Filter by status
                  </span>
                  {activeStatuses.size > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({ status: [], page: 1 })}
                      className="text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {/* Status list */}
                <div className="py-1 max-h-[280px] overflow-y-auto">
                  {ALL_STATUSES.map((value) => {
                    const isChecked = activeStatuses.has(value);
                    return (
                      <label
                        key={value}
                        className="flex items-center gap-3 px-3.5 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        {/* Custom checkbox */}
                        <span
                          className={cn(
                            'flex justify-center items-center rounded border-2 transition-all size-4 shrink-0',
                            isChecked
                              ? 'bg-sidebar-primary border-sidebar-primary'
                              : 'bg-white border-sidebar-border',
                          )}
                          aria-hidden
                        >
                          {isChecked && (
                            <Check
                              className="size-2.5 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          onChange={() => toggleStatus(value)}
                          aria-label={statusLabel(value)}
                        />
                        <StatusBadge status={value} />
                      </label>
                    );
                  })}
                </div>
              </DropdownPanel>
            )}
          </div>

          {/* — Pets dropdown — */}
          <div className="relative shrink-0">
            <FilterBtn
              label="Pets"
              count={query.hasPets !== null ? 1 : 0}
              isOpen={openKey === 'pets'}
              onClick={() => toggle('pets')}
            />
            {openKey === 'pets' && (
              <DropdownPanel width="w-44">
                <TriOptions
                  label="Has pets"
                  value={query.hasPets}
                  options={[
                    { label: 'Any', value: null },
                    { label: 'With pets', value: true },
                    { label: 'No pets', value: false },
                  ]}
                  onChange={(v) => {
                    onChange({ hasPets: v, page: 1 });
                    setOpenKey(null);
                  }}
                />
              </DropdownPanel>
            )}
          </div>

          {/* — Parking dropdown — */}
          <div className="relative shrink-0">
            <FilterBtn
              label="Parking"
              count={query.needParking !== null ? 1 : 0}
              isOpen={openKey === 'parking'}
              onClick={() => toggle('parking')}
            />
            {openKey === 'parking' && (
              <DropdownPanel width="w-48">
                <TriOptions
                  label="Needs parking"
                  value={query.needParking}
                  options={[
                    { label: 'Any', value: null },
                    { label: 'Needs parking', value: true },
                    { label: 'No parking needed', value: false },
                  ]}
                  onChange={(v) => {
                    onChange({ needParking: v, page: 1 });
                    setOpenKey(null);
                  }}
                />
              </DropdownPanel>
            )}
          </div>

          {/* — Tests toggle — */}
          <button
            type="button"
            role="switch"
            aria-checked={query.includeTests}
            onClick={() =>
              onChange({ includeTests: !query.includeTests, page: 1 })
            }
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold',
              'border transition-all duration-100 select-none shrink-0 min-h-[44px]',
              query.includeTests
                ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary'
                : 'bg-white text-sidebar-muted border-sidebar-border hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
            )}
          >
            <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
            Tests
          </button>

          {/* — Reset — */}
          {isDirty && (
            <>
              <div className="w-px h-5 bg-slate-200 shrink-0 mx-0.5" />
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 px-2.5 py-2.5 rounded-lg text-[13px] font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 min-h-[44px]"
              >
                <X className="size-3.5" aria-hidden />
                Reset
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Radio-style option list for tri-state filters ──────────
function TriOptions({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: boolean | null;
  options: { label: string; value: boolean | null }[];
  onChange: (v: boolean | null) => void;
}) {
  return (
    <>
      <div
        className="px-3.5 py-2.5"
        style={{ borderBottom: '1px solid #f1f5f9' }}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <div className="py-1">
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3.5 py-2 text-left transition-colors',
                isSelected ? 'bg-slate-50' : 'hover:bg-slate-50',
              )}
            >
              {/* Radio dot */}
              <span
                className={cn(
                  'flex justify-center items-center rounded-full border-2 transition-all size-4 shrink-0',
                  isSelected
                    ? 'border-sidebar-primary bg-sidebar-primary'
                    : 'bg-white border-sidebar-border',
                )}
                aria-hidden
              >
                {isSelected && (
                  <span className="size-1.5 rounded-full bg-white" />
                )}
              </span>
              <span
                className={cn(
                  'text-[13px]',
                  isSelected
                    ? 'font-semibold text-slate-800'
                    : 'font-medium text-slate-600',
                )}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
