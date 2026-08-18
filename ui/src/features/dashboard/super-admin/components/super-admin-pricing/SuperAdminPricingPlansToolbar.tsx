import { Filter, Search } from 'lucide-react';

import { SuperAdminListViewToggle } from '@/features/dashboard/super-admin/components/shared/SuperAdminListViewToggle';
import { SuperAdminResultsMeta } from '@/features/dashboard/super-admin/components/shared/SuperAdminResultsMeta';
import type {
  SuperAdminPricingPlansFilters,
  SuperAdminPricingPlansViewMode,
} from '@/features/dashboard/super-admin/lib/superAdminPricingFilters';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  filters: SuperAdminPricingPlansFilters;
  viewMode: SuperAdminPricingPlansViewMode;
  hideTableView?: boolean;
  onSearchChange: (value: string) => void;
  onModelChange: (value: SuperAdminPricingPlansFilters['model']) => void;
  onStatusChange: (value: SuperAdminPricingPlansFilters['status']) => void;
  onViewModeChange: (mode: SuperAdminPricingPlansViewMode) => void;
};

export function SuperAdminPricingPlansToolbar({
  filters,
  viewMode,
  hideTableView = false,
  onSearchChange,
  onModelChange,
  onStatusChange,
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
            placeholder="Search plans…"
            className="h-10 pl-9"
            aria-label="Search plans"
          />
        </div>

        <Select value={filters.model} onValueChange={onModelChange}>
          <SelectTrigger
            className="h-10 w-[min(100%,10.5rem)] shrink-0 sm:w-[10.5rem]"
            aria-label="Filter by model"
          >
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="commission">Commission</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={onStatusChange}>
          <SelectTrigger
            className="h-10 w-[min(100%,9.5rem)] shrink-0 sm:w-[9.5rem]"
            aria-label="Filter by status"
          >
            <Filter className="size-4 shrink-0 opacity-70" aria-hidden />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SuperAdminListViewToggle
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        hideTableView={hideTableView}
        className="self-end sm:self-auto"
      />
    </div>
  );
}

export { SuperAdminResultsMeta as SuperAdminPricingPlansResultsMeta };
