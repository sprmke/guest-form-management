import { useEffect, useRef, useState } from 'react';

import { Filter, Search, X } from 'lucide-react';

import { AdminListPerPageSelect } from '@/features/dashboard/bookings/components/AdminListToolbar';
import { AdminListViewToggle } from '@/features/dashboard/bookings/components/AdminListViewToggle';
import type { AdminListView } from '@/features/dashboard/bookings/lib/listView';
import { FinanceCategoryFilter } from '@/features/dashboard/finance/components/FinanceCategoryFilter';
import { MaintenanceRemindersSortMenu } from '@/features/dashboard/maintenance/components/MaintenanceRemindersSortMenu';
import { MaintenanceStatusFilter } from '@/features/dashboard/maintenance/components/MaintenanceStatusFilter';
import { MaintenanceTelegramFilter } from '@/features/dashboard/maintenance/components/MaintenanceTelegramFilter';
import type { MaintenanceQuery } from '@/features/dashboard/maintenance/lib/types';

import {
  AdminListRefineSection,
  AdminListRefineSheet,
  AdminMobileSearchFilterRow,
} from '@/components/mobile/AdminListRefineSheet';
import { cn } from '@/lib/utils';

type Props = {
  query: MaintenanceQuery;
  categories: string[];
  onChange: (next: MaintenanceQuery) => void;
  hideTableView?: boolean;
  showPerPage?: boolean;
};

export function MaintenanceRemindersToolbar({
  query,
  categories,
  onChange,
  hideTableView = false,
  showPerPage = true,
}: Props) {
  const [searchDraft, setSearchDraft] = useState(query.q);
  const [refineOpen, setRefineOpen] = useState(false);
  const searchMount = useRef(true);

  const activeFilterCount =
    query.statusFilter.length +
    query.categoryFilter.length +
    (query.telegramFilter !== 'all' ? 1 : 0);

  useEffect(() => {
    if (searchMount.current) {
      searchMount.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      if (searchDraft !== query.q) {
        onChange({ ...query, page: 1, q: searchDraft });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, query, onChange]);

  useEffect(() => {
    setSearchDraft(query.q);
  }, [query.q]);

  function resetFilters() {
    onChange({
      ...query,
      page: 1,
      statusFilter: [],
      categoryFilter: [],
      telegramFilter: 'all',
    });
  }

  const searchField = (
    <div className={cn('relative w-full min-w-0 lg:max-w-sm')}>
      <Search
        className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        type="search"
        role="searchbox"
        inputMode="search"
        enterKeyHint="search"
        placeholder="Search reminders…"
        aria-label="Search reminders"
        className={cn(
          'border-border bg-muted/40 text-foreground h-12 min-h-[48px] w-full rounded-2xl border py-2.5 pl-10 text-[15px]',
          'lg:bg-muted/50 lg:h-10 lg:min-h-[44px] lg:rounded-lg lg:pl-9 lg:text-[13px]',
          searchDraft ? 'pr-11' : 'pr-3',
          'placeholder:text-muted-foreground',
          'focus:border-primary/40 focus:bg-card focus:ring-primary/20 focus:outline-none focus:ring-2'
        )}
        value={searchDraft}
        onChange={(e) => setSearchDraft(e.target.value)}
      />
      {searchDraft ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg"
          aria-label="Clear search"
          onClick={() => setSearchDraft('')}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );

  const filterControls = (
    <>
      <MaintenanceStatusFilter
        value={query.statusFilter}
        onChange={(statusFilter) => onChange({ ...query, page: 1, statusFilter })}
      />
      <FinanceCategoryFilter
        categories={categories}
        value={query.categoryFilter}
        onChange={(categoryFilter) => onChange({ ...query, page: 1, categoryFilter })}
      />
      <MaintenanceTelegramFilter
        value={query.telegramFilter}
        onChange={(telegramFilter) => onChange({ ...query, page: 1, telegramFilter })}
      />
    </>
  );

  const viewToggle = (
    <AdminListViewToggle
      value={query.view}
      onChange={(view: AdminListView) => onChange({ ...query, view, page: 1 })}
      hideTableView={hideTableView}
      ariaLabel="Choose reminders view"
    />
  );

  return (
    <>
      <div className="space-y-2.5 lg:hidden">
        <AdminMobileSearchFilterRow
          search={searchField}
          filterCount={activeFilterCount}
          filtersOpen={refineOpen}
          onFiltersOpenChange={setRefineOpen}
          filterAriaLabel="Refine reminders"
        />
        {viewToggle}
        <AdminListRefineSheet
          open={refineOpen}
          onOpenChange={setRefineOpen}
          title="Refine"
          activeCount={activeFilterCount}
          onClear={resetFilters}
        >
          <AdminListRefineSection title="Filters">
            <div className="flex flex-col gap-2 [&_button]:w-full">{filterControls}</div>
          </AdminListRefineSection>
          <AdminListRefineSection title="Sort">
            <MaintenanceRemindersSortMenu
              sort={query.sort}
              onChange={(sort) => onChange({ ...query, sort, page: 1 })}
            />
          </AdminListRefineSection>
          {showPerPage ? (
            <AdminListRefineSection title="Per page">
              <AdminListPerPageSelect
                limit={query.limit}
                onChange={(limit) => onChange({ ...query, limit, page: 1 })}
              />
            </AdminListRefineSection>
          ) : null}
        </AdminListRefineSheet>
      </div>

      <div className="hidden space-y-3 lg:block">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {searchField}

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {filterControls}
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2.5 text-xs font-semibold lg:min-h-0"
              >
                <Filter className="size-3.5" aria-hidden />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <MaintenanceRemindersSortMenu
              sort={query.sort}
              onChange={(sort) => onChange({ ...query, sort, page: 1 })}
            />
            {showPerPage ? (
              <AdminListPerPageSelect
                limit={query.limit}
                onChange={(limit) => onChange({ ...query, limit, page: 1 })}
              />
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">{viewToggle}</div>
        </div>
      </div>
    </>
  );
}
