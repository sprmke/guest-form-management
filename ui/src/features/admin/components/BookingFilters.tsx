import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BOOKING_STATUSES,
  LEGACY_BOOKING_STATUSES,
  STATUS_TONE,
  statusLabel,
} from '@/features/admin/lib/bookingStatus';
import type { BookingsQuery } from '@/features/admin/lib/types';

type Props = {
  query: BookingsQuery;
  onChange: (patch: Partial<BookingsQuery>) => void;
  onReset: () => void;
};

const TONE_CHIP: Record<string, string> = {
  red:     'bg-red-50 text-red-900 ring-red-200 data-[on=true]:bg-red-500 data-[on=true]:text-white data-[on=true]:ring-red-500',
  yellow:  'bg-amber-50 text-amber-900 ring-amber-200 data-[on=true]:bg-amber-500 data-[on=true]:text-white data-[on=true]:ring-amber-500',
  green:   'bg-emerald-50 text-emerald-900 ring-emerald-200 data-[on=true]:bg-emerald-600 data-[on=true]:text-white data-[on=true]:ring-emerald-600',
  orange:  'bg-orange-50 text-orange-900 ring-orange-200 data-[on=true]:bg-orange-500 data-[on=true]:text-white data-[on=true]:ring-orange-500',
  blue:    'bg-sky-50 text-sky-900 ring-sky-200 data-[on=true]:bg-sky-600 data-[on=true]:text-white data-[on=true]:ring-sky-600',
  purple:  'bg-violet-50 text-violet-900 ring-violet-200 data-[on=true]:bg-violet-600 data-[on=true]:text-white data-[on=true]:ring-violet-600',
  neutral: 'bg-muted text-foreground ring-border data-[on=true]:bg-foreground data-[on=true]:text-background data-[on=true]:ring-foreground',
};

const ALL_STATUSES = [...BOOKING_STATUSES, ...LEGACY_BOOKING_STATUSES];

export function BookingFilters({ query, onChange, onReset }: Props) {
  const [searchDraft, setSearchDraft] = useState(query.q);
  const firstMount = useRef(true);

  useEffect(() => {
    setSearchDraft(query.q);
  }, [query.q]);

  // Debounce search input so we don't fire a network request on every keystroke.
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    const handle = setTimeout(() => {
      if (searchDraft !== query.q) onChange({ q: searchDraft, page: 1 });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchDraft, query.q, onChange]);

  const activeStatuses = new Set(query.status);
  const toggleStatus = (value: string) => {
    const next = new Set(activeStatuses);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange({ status: Array.from(next), page: 1 });
  };

  const toggleTri = (current: boolean | null, value: boolean): boolean | null =>
    current === value ? null : value;

  const isDirty =
    query.q !== '' ||
    query.status.length > 0 ||
    query.hasPets !== null ||
    query.needParking !== null ||
    query.includeTests !== false;

  return (
    <div className="overflow-hidden rounded-2xl border shadow-soft bg-card border-border/60">
      {/* Search + reset */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 w-4 h-4 -translate-y-1/2 pointer-events-none text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by guest name or email…"
            className="pl-10"
            aria-label="Search bookings"
          />
          {searchDraft && (
            <button
              type="button"
              onClick={() => setSearchDraft('')}
              className="absolute top-1/2 right-2 p-1 rounded -translate-y-1/2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isDirty && (
          <Button variant="ghost" size="sm" onClick={onReset} className="sm:self-center">
            Reset filters
          </Button>
        )}
      </div>

      {/* Status chips */}
      <div className="px-4 pb-3 border-t border-border/50 bg-muted/30">
        <div className="flex flex-wrap gap-1.5 pt-3">
          {ALL_STATUSES.map((value) => {
            const isOn = activeStatuses.has(value);
            const tone = STATUS_TONE[value] ?? 'neutral';
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleStatus(value)}
                data-on={isOn}
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
                  TONE_CHIP[tone],
                )}
                aria-pressed={isOn}
              >
                {statusLabel(value)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Flag toggles */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-border/50">
        <TriStateToggle
          label="Has pets"
          value={query.hasPets}
          onChange={(v) => onChange({ hasPets: toggleTri(query.hasPets, v), page: 1 })}
        />
        <TriStateToggle
          label="Needs parking"
          value={query.needParking}
          onChange={(v) => onChange({ needParking: toggleTri(query.needParking, v), page: 1 })}
        />
        <Toggle
          label="Include test bookings"
          active={query.includeTests}
          onClick={() => onChange({ includeTests: !query.includeTests, page: 1 })}
        />
      </div>
    </div>
  );
}

function TriStateToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex gap-1 items-center p-1 rounded-lg border bg-background border-border/60">
      <span className="px-2 text-xs font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'rounded-md px-2 py-1 text-xs font-medium transition-colors',
          value === true
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground hover:bg-muted',
        )}
        aria-pressed={value === true}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'rounded-md px-2 py-1 text-xs font-medium transition-colors',
          value === false
            ? 'bg-muted-foreground text-background'
            : 'text-foreground hover:bg-muted',
        )}
        aria-pressed={value === false}
      >
        No
      </button>
    </div>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/60 bg-background text-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  );
}
