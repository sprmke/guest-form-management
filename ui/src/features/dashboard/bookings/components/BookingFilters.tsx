import { useEffect, useRef, useState } from 'react';

import { ChevronDown, Filter, Search, SlidersHorizontal, X } from 'lucide-react';

import { AdminListPerPageSelect } from '@/features/dashboard/bookings/components/AdminListToolbar';
import { BookingsSortMenu } from '@/features/dashboard/bookings/components/BookingsSortMenu';
import {
  BookingViewToggle,
  type BookingView,
} from '@/features/dashboard/bookings/components/BookingViewToggle';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import {
  bookingsStatusFilterRows,
  statusLabel,
  type BookingStatus,
} from '@/features/dashboard/bookings/lib/bookingStatus';
import type {
  BookingsQuery,
  BookingsSort,
  BookingKind,
} from '@/features/dashboard/bookings/lib/types';

import {
  AdminListRefineSection,
  AdminListRefineSheet,
  AdminMobileSearchFilterRow,
} from '@/components/mobile/AdminListRefineSheet';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroupDisplay } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type Props = {
  query: BookingsQuery;
  onChange: (patch: Partial<BookingsQuery>) => void;
  onReset: () => void;
  sort: BookingsSort;
  onSortChange: (sort: BookingsSort) => void;
  view: BookingView;
  onViewChange: (view: BookingView) => void;
  hideTableView?: boolean;
  showPerPage?: boolean;
  /** Hide pets / parking toggles (parking slot admin). */
  hideGuestStayFilters?: boolean;
  /** Org list: filter property vs parking rows. */
  showBookingKindFilter?: boolean;
  hideKanbanView?: boolean;
  searchPlaceholder?: string;
};

function FilterBtn({
  label,
  count = 0,
  isOpen,
  onClick,
  icon: Icon,
  className,
}: {
  label: string;
  count?: number;
  isOpen: boolean;
  onClick: () => void;
  icon?: typeof SlidersHorizontal;
  className?: string;
}) {
  const active = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] font-semibold',
        'select-none whitespace-nowrap transition-all duration-100 lg:min-h-0 lg:rounded-lg',
        'native-press',
        active || isOpen
          ? 'interactive-primary border-border'
          : 'border-border bg-card text-foreground hover:bg-muted/60',
        className
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span className="truncate">{label}</span>
      {active ? (
        <span className="bg-muted text-foreground inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold">
          {count}
        </span>
      ) : null}
      <ChevronDown
        className={cn(
          'size-3.5 shrink-0 transition-transform duration-150',
          isOpen && 'rotate-180'
        )}
        aria-hidden
      />
    </button>
  );
}

function DropdownPanel({
  children,
  width = 'w-64',
  align = 'left',
}: {
  children: React.ReactNode;
  width?: string;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'border-border/50 bg-popover shadow-elevated-lg dark:border-border/20 absolute top-full z-50 mt-1.5 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border',
        align === 'right' ? 'right-0' : 'left-0',
        width
      )}
    >
      {children}
    </div>
  );
}

export function BookingFilters({
  query,
  onChange,
  onReset,
  sort,
  onSortChange,
  view,
  onViewChange,
  hideTableView = false,
  showPerPage = true,
  hideGuestStayFilters = false,
  showBookingKindFilter = false,
  hideKanbanView = false,
  searchPlaceholder = 'Search guests, email, phone, plate, pet…',
}: Props) {
  const [draft, setDraft] = useState(query.q);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const moreFilterRef = useRef<HTMLDivElement>(null);
  const firstMount = useRef(true);

  useEffect(() => {
    setDraft(query.q);
  }, [query.q]);

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

  useEffect(() => {
    if (!openKey) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideOpen =
        (openKey === 'status' && statusFilterRef.current?.contains(target)) ||
        (openKey === 'more' && moreFilterRef.current?.contains(target));
      if (!insideOpen) setOpenKey(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openKey]);

  const toggle = (key: string) => setOpenKey((k) => (k === key ? null : key));

  const activeStatuses = new Set(query.status);
  const toggleStatus = (v: string) => {
    const next = new Set(activeStatuses);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange({ status: Array.from(next), page: 1 });
  };

  const moreFiltersCount =
    (showBookingKindFilter && query.bookingKind ? 1 : 0) +
    (hideGuestStayFilters
      ? 0
      : (query.hasPets !== null ? 1 : 0) + (query.needParking !== null ? 1 : 0));

  const refineCount = query.status.length + moreFiltersCount;
  const isDirty =
    Boolean(query.q) ||
    query.status.length > 0 ||
    (showBookingKindFilter && query.bookingKind !== null) ||
    (!hideGuestStayFilters && query.hasPets !== null) ||
    (!hideGuestStayFilters && query.needParking !== null);

  const searchField = (
    <BookingsSearchField
      value={draft}
      onChange={setDraft}
      placeholder={searchPlaceholder}
      className="lg:max-w-sm"
    />
  );

  const statusList = (
    <>
      {bookingsStatusFilterRows().map((row) =>
        row.type === 'group' ? (
          <PendingDocumentsStatusGroup
            key={row.parent}
            parent={row.parent}
            children={row.children}
            activeStatuses={activeStatuses}
            onToggle={toggleStatus}
          />
        ) : (
          <StatusFilterOption
            key={row.value}
            value={row.value}
            isChecked={activeStatuses.has(row.value)}
            onToggle={() => toggleStatus(row.value)}
          />
        )
      )}
    </>
  );

  const moreFilterBody =
    hideGuestStayFilters && !showBookingKindFilter ? null : (
      <>
        {showBookingKindFilter ? (
          <KindOptions
            value={query.bookingKind}
            onChange={(v) => onChange({ bookingKind: v, page: 1 })}
          />
        ) : null}
        {!hideGuestStayFilters ? (
          <>
            <TriOptions
              label="Has pets"
              value={query.hasPets}
              options={[
                { label: 'Any', value: null },
                { label: 'With pets', value: true },
                { label: 'No pets', value: false },
              ]}
              onChange={(v) => onChange({ hasPets: v, page: 1 })}
            />
            <TriOptions
              label="Needs parking"
              value={query.needParking}
              options={[
                { label: 'Any', value: null },
                { label: 'Needs parking', value: true },
                { label: 'No parking needed', value: false },
              ]}
              onChange={(v) => onChange({ needParking: v, page: 1 })}
            />
          </>
        ) : null}
      </>
    );

  const viewToggle = (
    <BookingViewToggle
      value={view}
      onChange={onViewChange}
      hideTableView={hideTableView}
      hideKanbanView={hideKanbanView}
    />
  );

  return (
    <>
      {/* Mobile — search + refine sheet + view (progressive disclosure) */}
      <div className="space-y-2.5 lg:hidden">
        <AdminMobileSearchFilterRow
          search={searchField}
          filterCount={refineCount}
          filtersOpen={refineOpen}
          onFiltersOpenChange={setRefineOpen}
          filterAriaLabel="Refine bookings"
        />
        {viewToggle}
        <AdminListRefineSheet
          open={refineOpen}
          onOpenChange={setRefineOpen}
          title="Refine"
          activeCount={refineCount}
          onClear={() => {
            onReset();
            setDraft('');
          }}
        >
          <AdminListRefineSection title="Status">
            <div className="border-border/60 overflow-hidden rounded-xl border">{statusList}</div>
          </AdminListRefineSection>
          {moreFilterBody ? (
            <AdminListRefineSection title="More">{moreFilterBody}</AdminListRefineSection>
          ) : null}
          <AdminListRefineSection title="Sort">
            <BookingsSortMenu sort={sort} onChange={onSortChange} fullWidth />
          </AdminListRefineSection>
          {showPerPage ? (
            <AdminListRefineSection title="Per page">
              <AdminListPerPageSelect
                limit={query.limit}
                onChange={(limit) => onChange({ limit, page: 1 })}
              />
            </AdminListRefineSection>
          ) : null}
        </AdminListRefineSheet>
      </div>

      {/* Desktop — full inline toolbar */}
      <div className="hidden space-y-2.5 lg:block">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          {searchField}

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <div ref={statusFilterRef} className="relative min-w-0 sm:flex-none">
              <FilterBtn
                label="Status"
                count={query.status.length}
                isOpen={openKey === 'status'}
                onClick={() => toggle('status')}
              />
              {openKey === 'status' ? (
                <DropdownPanel width="w-72" align="left">
                  <div className="border-separator flex items-center justify-between border-b px-3.5 py-2.5">
                    <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                      Filter by status
                    </span>
                    {activeStatuses.size > 0 ? (
                      <button
                        type="button"
                        onClick={() => onChange({ status: [], page: 1 })}
                        className="text-muted-foreground hover:text-foreground text-[12px] font-semibold transition-colors"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-[min(60vh,320px)] overflow-y-auto py-1">{statusList}</div>
                </DropdownPanel>
              ) : null}
            </div>

            {hideGuestStayFilters && !showBookingKindFilter ? null : (
              <div ref={moreFilterRef} className="relative min-w-0 sm:flex-none">
                <FilterBtn
                  label="Filters"
                  count={moreFiltersCount}
                  isOpen={openKey === 'more'}
                  onClick={() => toggle('more')}
                  icon={SlidersHorizontal}
                />
                {openKey === 'more' ? (
                  <DropdownPanel width="w-80" align="left">
                    <div className="border-separator border-b px-3.5 py-2.5">
                      <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                        More filters
                      </span>
                    </div>
                    <div className="max-h-[min(60vh,320px)] overflow-y-auto">{moreFilterBody}</div>
                  </DropdownPanel>
                ) : null}
              </div>
            )}

            {isDirty ? (
              <button
                type="button"
                onClick={onReset}
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
              <BookingsSortMenu sort={sort} onChange={onSortChange} fullWidth />
            </div>
            {showPerPage ? (
              <AdminListPerPageSelect
                limit={query.limit}
                onChange={(limit) => onChange({ limit, page: 1 })}
              />
            ) : null}
          </div>
          {viewToggle}
        </div>
      </div>
    </>
  );
}

function BookingsSearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        type="search"
        role="searchbox"
        inputMode="search"
        enterKeyHint="search"
        placeholder={placeholder}
        aria-label="Search bookings"
        className={cn(
          'border-border bg-card text-foreground shadow-soft field-focus h-12 min-h-[48px] w-full rounded-2xl border py-2.5 pl-11 text-[15px]',
          'sm:h-10 sm:min-h-[44px] sm:rounded-xl sm:pl-10 sm:text-[13px] sm:shadow-none',
          value ? 'pr-11' : 'pr-3.5',
          'placeholder:text-muted-foreground'
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-xl"
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function KindOptions({
  value,
  onChange,
}: {
  value: BookingKind | null;
  onChange: (v: BookingKind | null) => void;
}) {
  const options: { label: string; value: BookingKind | null }[] = [
    { label: 'All types', value: null },
    { label: 'Property stays', value: 'property' },
    { label: 'Parking', value: 'parking' },
  ];
  return (
    <>
      <div className="border-separator border-b px-3.5 py-2.5">
        <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
          Booking type
        </span>
      </div>
      <div className="py-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors',
              opt.value === value ? 'bg-muted/60' : 'hover:bg-muted/40'
            )}
          >
            <span className="text-[13px] font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

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
      <div className="border-separator border-b px-3.5 py-2.5">
        <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
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
                'flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors',
                isSelected ? 'bg-muted/50' : 'hover:bg-muted/50'
              )}
            >
              <RadioGroupDisplay checked={isSelected} />
              <span
                className={cn(
                  'text-[13px]',
                  isSelected ? 'text-foreground font-semibold' : 'text-foreground/75 font-medium'
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

function StatusFilterOption({
  value,
  isChecked,
  onToggle,
  nested = false,
  indeterminate = false,
}: {
  value: BookingStatus;
  isChecked: boolean;
  onToggle: () => void;
  nested?: boolean;
  indeterminate?: boolean;
}) {
  return (
    <label
      className={cn(
        'hover:bg-muted/50 flex min-h-[44px] cursor-pointer items-center gap-3 py-2.5 transition-colors',
        nested ? 'pl-9 pr-3.5' : 'px-3.5'
      )}
    >
      <Checkbox
        checked={indeterminate ? 'indeterminate' : isChecked}
        onCheckedChange={onToggle}
        aria-label={statusLabel(value)}
      />
      <StatusBadge status={value} />
    </label>
  );
}

function PendingDocumentsStatusGroup({
  parent,
  children: subStatuses,
  activeStatuses,
  onToggle,
}: {
  parent: 'PENDING_DOCUMENTS';
  children: readonly BookingStatus[];
  activeStatuses: Set<string>;
  onToggle: (value: string) => void;
}) {
  const parentChecked = activeStatuses.has(parent);
  const checkedChildCount = subStatuses.filter((s) => activeStatuses.has(s)).length;
  const allChildrenChecked = checkedChildCount === subStatuses.length;
  const parentIndeterminate =
    (parentChecked && !allChildrenChecked) || (!parentChecked && checkedChildCount > 0);

  return (
    <div className="py-0.5">
      <StatusFilterOption
        value={parent}
        isChecked={parentChecked}
        indeterminate={parentIndeterminate}
        onToggle={() => onToggle(parent)}
      />
      <div
        className="ml-5 mr-2 border-l border-amber-200/80 pl-1 dark:border-amber-500/40"
        role="group"
        aria-label="Pending Documents sub-stages"
      >
        {subStatuses.map((value) => (
          <StatusFilterOption
            key={value}
            value={value}
            isChecked={activeStatuses.has(value)}
            onToggle={() => onToggle(value)}
            nested
          />
        ))}
      </div>
    </div>
  );
}
