import { Car, Filter, Grid3X3, LayoutList, Search } from 'lucide-react';

import {
  ORG_PARKING_STATUSES,
  ORG_PARKING_TYPES,
} from '@/features/dashboard/org/lib/orgParkingDisplay';
import type {
  OrgParkingsFilters,
  OrgParkingsViewMode,
} from '@/features/dashboard/org/lib/orgParkingsFilters';

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
  filters: OrgParkingsFilters;
  viewMode: OrgParkingsViewMode;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: OrgParkingsFilters['status']) => void;
  onTypeChange: (value: string) => void;
  onViewModeChange: (mode: OrgParkingsViewMode) => void;
};

export function OrgParkingsToolbar({
  filters,
  viewMode,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onViewModeChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative min-w-[min(100%,16rem)] flex-1 sm:max-w-xs">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={filters.search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search parkings…"
            className="h-10 pl-9"
            aria-label="Search parkings"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => onStatusChange(value as OrgParkingsFilters['status'])}
        >
          <SelectTrigger className="h-10 w-[min(100%,9.5rem)] shrink-0 sm:w-[9.5rem]">
            <Filter className="size-4 shrink-0 opacity-70" aria-hidden />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {ORG_PARKING_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={onTypeChange}>
          <SelectTrigger className="h-10 w-[min(100%,9.5rem)] shrink-0 sm:w-[9.5rem]">
            <Car className="size-4 shrink-0 opacity-70" aria-hidden />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ORG_PARKING_TYPES.map((type) => (
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

export function OrgParkingsResultsMeta({
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
