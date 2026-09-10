import { useEffect, useMemo, useRef, useState } from 'react';

import { Search, ShieldAlert, X } from 'lucide-react';

import { ActivityCategoryChips } from '@/features/dashboard/activity/components/ActivityCategoryChips';
import type { ActivityLogFilters } from '@/features/dashboard/activity/lib/activityApi';
import type { ActivityCategory } from '@/features/dashboard/activity/lib/activityCatalog';
import {
  activityRefineFilterCount,
  clearActivityFilters,
  hasActivityFilters,
} from '@/features/dashboard/activity/lib/activityFilterUtils';

import {
  AdminListRefineSection,
  AdminListRefineSheet,
  AdminMobileSearchFilterRow,
} from '@/components/mobile/AdminListRefineSheet';
import { AdminListRefinePopover } from '@/components/navigation/AdminListRefinePopover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  filters: ActivityLogFilters;
  onChange: (next: ActivityLogFilters) => void;
  className?: string;
};

export function ActivityFilters({ filters, onChange, className }: Props) {
  const [searchDraft, setSearchDraft] = useState(filters.q ?? '');
  const [mobileRefineOpen, setMobileRefineOpen] = useState(false);
  const [desktopRefineOpen, setDesktopRefineOpen] = useState(false);
  const searchMount = useRef(true);

  const activeCategories = useMemo(
    () => new Set<ActivityCategory>(filters.category ?? []),
    [filters.category]
  );
  const destructiveOnly = filters.severity === 'destructive';
  const refineCount = activityRefineFilterCount(filters);
  const anyFilters = hasActivityFilters(filters);

  useEffect(() => {
    if (searchMount.current) {
      searchMount.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const nextQ = searchDraft.trim() || null;
      if (nextQ !== (filters.q ?? null)) {
        onChange({ ...filters, q: nextQ });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters, onChange]);

  useEffect(() => {
    setSearchDraft(filters.q ?? '');
  }, [filters.q]);

  const toggleCategory = (cat: ActivityCategory) => {
    const next = new Set(activeCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onChange({ ...filters, category: [...next] });
  };

  const clearAll = () => onChange(clearActivityFilters(filters));

  const clearRefine = () =>
    onChange({
      ...filters,
      category: [],
      severity: null,
      dateFrom: null,
      dateTo: null,
    });

  const searchField = <ActivitySearchField value={searchDraft} onChange={setSearchDraft} />;

  const destructiveToggle = (
    <Button
      type="button"
      variant={destructiveOnly ? 'destructive' : 'outline'}
      size="sm"
      className="h-10 min-h-[44px] shrink-0 gap-1.5 rounded-lg text-[13px] font-semibold lg:text-sm"
      onClick={() => onChange({ ...filters, severity: destructiveOnly ? null : 'destructive' })}
      aria-pressed={destructiveOnly}
    >
      <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
      Destructive
    </Button>
  );

  const dateFields = (
    <ActivityDateRangeFields
      dateFrom={filters.dateFrom}
      dateTo={filters.dateTo}
      onChange={(patch) => onChange({ ...filters, ...patch })}
      stacked
    />
  );

  const mobileRefineBody = (
    <>
      <AdminListRefineSection title="Categories">
        <ActivityCategoryChips
          selected={activeCategories}
          onToggle={toggleCategory}
          layout="wrap"
        />
      </AdminListRefineSection>
      <AdminListRefineSection title="Severity">{destructiveToggle}</AdminListRefineSection>
      <AdminListRefineSection title="Date range">{dateFields}</AdminListRefineSection>
    </>
  );

  const desktopRefineBody = (
    <div className="flex w-full min-w-0 flex-col gap-3 px-2 py-1.5">
      <ActivityCategoryChips selected={activeCategories} onToggle={toggleCategory} layout="wrap" />
      <ActivityDateRangeFields
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        onChange={(patch) => onChange({ ...filters, ...patch })}
      />
    </div>
  );

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="lg:hidden">
        <AdminMobileSearchFilterRow
          search={searchField}
          filterCount={refineCount}
          filtersOpen={mobileRefineOpen}
          onFiltersOpenChange={setMobileRefineOpen}
          filterAriaLabel="Refine activity"
        />
        <AdminListRefineSheet
          open={mobileRefineOpen}
          onOpenChange={setMobileRefineOpen}
          title="Refine"
          description="Activity filters"
          activeCount={refineCount}
          onClear={refineCount > 0 ? clearRefine : undefined}
        >
          {mobileRefineBody}
        </AdminListRefineSheet>
      </div>

      <div
        role="toolbar"
        aria-label="Activity filters"
        className="hidden min-w-0 items-center gap-2 lg:flex"
      >
        <div className="min-w-0 flex-1">{searchField}</div>
        {destructiveToggle}
        <AdminListRefinePopover
          open={desktopRefineOpen}
          onOpenChange={setDesktopRefineOpen}
          activeCount={refineCount}
          onClear={refineCount > 0 ? clearRefine : undefined}
          aria-label="Activity filters"
        >
          {desktopRefineBody}
        </AdminListRefinePopover>
      </div>

      {anyFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {anyFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2 text-xs"
              onClick={clearAll}
            >
              <X className="mr-1 size-3.5" aria-hidden />
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActivitySearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 sm:left-3"
        aria-hidden
      />
      <input
        type="search"
        placeholder="Search activity"
        className={cn(
          'border-border bg-card text-foreground field-focus h-11 min-h-[44px] w-full rounded-2xl border py-2.5 pl-11 text-[13px]',
          'sm:h-10 sm:min-h-[44px] sm:rounded-xl sm:pl-10',
          'lg:h-10 lg:min-h-[44px] lg:rounded-lg lg:text-sm',
          value ? 'pr-11' : 'pr-3.5',
          'placeholder:text-muted-foreground placeholder:text-[13px] lg:placeholder:text-sm'
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search activity"
      />
      {value ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-xl"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function ActivityDateRangeFields({
  dateFrom,
  dateTo,
  onChange,
  stacked = false,
}: {
  dateFrom?: string | null;
  dateTo?: string | null;
  onChange: (patch: { dateFrom?: string | null; dateTo?: string | null }) => void;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn('flex items-center gap-2', stacked ? 'flex-col items-stretch' : 'flex-wrap')}
    >
      <Input
        type="date"
        value={dateFrom?.slice(0, 10) ?? ''}
        onChange={(e) => onChange({ dateFrom: e.target.value || null })}
        className={cn('h-10 min-h-[44px]', stacked ? 'w-full' : 'w-[10rem]')}
        aria-label="From date"
      />
      <span className={cn('text-muted-foreground text-xs', stacked && 'self-start')}>to</span>
      <Input
        type="date"
        value={dateTo?.slice(0, 10) ?? ''}
        onChange={(e) => onChange({ dateTo: e.target.value || null })}
        className={cn('h-10 min-h-[44px]', stacked ? 'w-full' : 'w-[10rem]')}
        aria-label="To date"
      />
    </div>
  );
}
