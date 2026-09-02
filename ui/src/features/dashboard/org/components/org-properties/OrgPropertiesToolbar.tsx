import { useState } from 'react';

import { Building2, Check, Filter, Grid3X3, LayoutList, Search } from 'lucide-react';

import type {
  OrgPropertiesFilters,
  OrgPropertiesViewMode,
} from '@/features/dashboard/org/lib/orgPropertiesFilters';
import {
  ORG_PROPERTY_STATUSES,
  ORG_PROPERTY_TYPES,
} from '@/features/dashboard/org/lib/orgPropertyDisplay';

import {
  AdminListRefineSection,
  AdminListRefineSheet,
  AdminMobileFilterButton,
} from '@/components/mobile/AdminListRefineSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Props = {
  filters: OrgPropertiesFilters;
  viewMode: OrgPropertiesViewMode;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: OrgPropertiesFilters['status']) => void;
  onTypeChange: (value: string) => void;
  onViewModeChange: (mode: OrgPropertiesViewMode) => void;
};

export function OrgPropertiesToolbar({
  filters,
  viewMode,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onViewModeChange,
}: Props) {
  const [refineOpen, setRefineOpen] = useState(false);
  const activeFilterCount = (filters.status !== 'all' ? 1 : 0) + (filters.type !== 'all' ? 1 : 0);

  const searchField = (
    <div className="relative min-w-[min(100%,16rem)] flex-1 sm:max-w-xs">
      <Search
        className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        value={filters.search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search properties…"
        className="h-10 pl-9"
        aria-label="Search properties"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Mobile/tablet: search + one refine sheet (status + type). */}
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
        {searchField}
        <AdminMobileFilterButton
          count={activeFilterCount}
          open={refineOpen}
          onClick={() => setRefineOpen(true)}
          aria-label="Filter properties"
        />
        <AdminListRefineSheet
          open={refineOpen}
          onOpenChange={setRefineOpen}
          title="Filter properties"
          activeCount={activeFilterCount}
          onClear={() => {
            onStatusChange('all');
            onTypeChange('all');
          }}
        >
          <AdminListRefineSection title="Status">
            <RefineOptionList
              value={filters.status}
              options={[{ value: 'all', label: 'All status' }, ...ORG_PROPERTY_STATUSES]}
              onSelect={(value) => onStatusChange(value as OrgPropertiesFilters['status'])}
            />
          </AdminListRefineSection>
          <AdminListRefineSection title="Type">
            <RefineOptionList
              value={filters.type}
              options={[{ value: 'all', label: 'All types' }, ...ORG_PROPERTY_TYPES]}
              onSelect={onTypeChange}
            />
          </AdminListRefineSection>
        </AdminListRefineSheet>
      </div>

      {/* Desktop: inline scroll strip with native selects. */}
      <div className="hidden min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden">
        {searchField}

        <Select
          value={filters.status}
          onValueChange={(value) => onStatusChange(value as OrgPropertiesFilters['status'])}
        >
          <SelectTrigger className="h-10 w-[min(100%,9.5rem)] shrink-0 sm:w-[9.5rem]">
            <Filter className="size-4 shrink-0 opacity-70" aria-hidden />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {ORG_PROPERTY_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={onTypeChange}>
          <SelectTrigger className="h-10 w-[min(100%,9.5rem)] shrink-0 sm:w-[9.5rem]">
            <Building2 className="size-4 shrink-0 opacity-70" aria-hidden />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ORG_PROPERTY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="border-border/50 bg-card flex shrink-0 items-center gap-1 self-end rounded-xl border p-1 shadow-sm sm:self-auto"
        role="group"
        aria-label="View mode"
      >
        <Button
          type="button"
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={() => onViewModeChange('grid')}
          aria-pressed={viewMode === 'grid'}
          aria-label="Grid view"
        >
          <Grid3X3 className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={() => onViewModeChange('list')}
          aria-pressed={viewMode === 'list'}
          aria-label="List view"
        >
          <LayoutList className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function RefineOptionList({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <div role="listbox" className="flex flex-col gap-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(option.value)}
            className={cn(
              'flex min-h-[48px] items-center justify-between rounded-lg border px-3 text-left text-sm transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-foreground font-medium'
                : 'border-border/60 text-foreground hover:bg-muted/50'
            )}
          >
            {option.label}
            {selected ? <Check className="text-primary size-4 shrink-0" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function OrgPropertiesResultsMeta({
  visibleCount,
  totalCount,
  className,
}: {
  visibleCount: number;
  totalCount: number;
  className?: string;
}) {
  if (totalCount === 0) return null;

  return (
    <p className={cn('text-muted-foreground text-xs sm:text-sm', className)}>
      Showing {visibleCount} of {totalCount}
    </p>
  );
}
