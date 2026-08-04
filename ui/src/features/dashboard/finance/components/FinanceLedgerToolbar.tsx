import { useEffect, useRef, useState } from 'react';

import { Filter, Search, X } from 'lucide-react';

import { AdminListPerPageSelect } from '@/features/dashboard/bookings/components/AdminListToolbar';
import { FinanceCategoryFilter } from '@/features/dashboard/finance/components/FinanceCategoryFilter';
import { FinanceLedgerSortMenu } from '@/features/dashboard/finance/components/FinanceLedgerSortMenu';
import { FinanceStatusFilter } from '@/features/dashboard/finance/components/FinanceStatusFilter';
import { FinanceStaysViewToggle } from '@/features/dashboard/finance/components/FinanceStaysViewToggle';
import { FinanceTypeFilter } from '@/features/dashboard/finance/components/FinanceTypeFilter';
import type { FinanceQuery } from '@/features/dashboard/finance/lib/types';

import {
  AdminListRefineSection,
  AdminListRefineSheet,
  AdminMobileSearchFilterRow,
} from '@/components/mobile/AdminListRefineSheet';
import { cn } from '@/lib/utils';

type Props = {
  query: FinanceQuery;
  categories: string[];
  onChange: (next: FinanceQuery) => void;
  hideTableView?: boolean;
  showPerPage?: boolean;
};

export function FinanceLedgerToolbar({
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
    (query.typeFilter !== 'all' ? 1 : 0) +
    (query.statusFilter.length > 0 ? 1 : 0) +
    (query.categoryFilter.length > 0 ? 1 : 0);

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
      typeFilter: 'all',
      statusFilter: [],
      categoryFilter: [],
    });
  }

  const searchField = (
    <FinanceSearchField value={searchDraft} onChange={setSearchDraft} className="lg:max-w-sm" />
  );

  const filterControls = (
    <>
      <FinanceTypeFilter
        value={query.typeFilter}
        onChange={(typeFilter) => onChange({ ...query, page: 1, typeFilter })}
      />
      <FinanceStatusFilter
        value={query.statusFilter}
        onChange={(statusFilter) => onChange({ ...query, page: 1, statusFilter })}
      />
      <FinanceCategoryFilter
        categories={categories}
        value={query.categoryFilter}
        onChange={(categoryFilter) => onChange({ ...query, page: 1, categoryFilter })}
      />
    </>
  );

  const viewToggle = (
    <FinanceStaysViewToggle
      value={query.view}
      onChange={(view) => onChange({ ...query, view, page: 1 })}
      hideTableView={hideTableView}
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
          filterAriaLabel="Refine transactions"
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
            <FinanceLedgerSortMenu
              sort={query.sort}
              onChange={(sort) => onChange({ ...query, sort, page: 1 })}
              fullWidth
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

      <div className="hidden space-y-2.5 sm:space-y-3 lg:block">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          {searchField}

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            {filterControls}
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-semibold lg:min-h-0"
              >
                <Filter className="size-3.5" aria-hidden />
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:flex-none">
              <FinanceLedgerSortMenu
                sort={query.sort}
                onChange={(sort) => onChange({ ...query, sort, page: 1 })}
                fullWidth
              />
            </div>
            {showPerPage ? (
              <AdminListPerPageSelect
                limit={query.limit}
                onChange={(limit) => onChange({ ...query, limit, page: 1 })}
              />
            ) : null}
          </div>
          {viewToggle}
        </div>
      </div>
    </>
  );
}

function FinanceSearchField({
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
        placeholder="Search transactions..."
        className={cn(
          'border-border bg-muted/40 text-foreground h-12 min-h-[48px] w-full rounded-2xl border py-2.5 pl-10 text-[15px]',
          'sm:bg-muted/50 sm:h-10 sm:min-h-[44px] sm:rounded-xl sm:pl-9 sm:text-[13px]',
          value ? 'pr-11' : 'pr-3.5',
          'placeholder:text-muted-foreground',
          'focus:border-primary/40 focus:bg-card focus:ring-primary/20 focus:outline-none focus:ring-2'
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
