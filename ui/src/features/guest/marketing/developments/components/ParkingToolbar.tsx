import { ArrowUpDown, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { ParkingSortKey } from '../lib/parkingSlotFilters';

interface ParkingToolbarProps {
  sortBy: ParkingSortKey;
  onSortChange: (sort: ParkingSortKey) => void;
  totalResults: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}

const sortOptions: Array<{ value: ParkingSortKey; label: string }> = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'tower', label: 'Tower' },
];

export function ParkingToolbar({
  sortBy,
  onSortChange,
  totalResults,
  filtersOpen,
  onToggleFilters,
}: ParkingToolbarProps) {
  return (
    <div className="border-border bg-background border-b">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className={cn(
              'hidden min-h-[44px] gap-2 lg:flex',
              filtersOpen && 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>

          <span className="text-muted-foreground text-sm">
            <span className="text-foreground font-semibold">{totalResults}</span>{' '}
            {totalResults === 1 ? 'slot' : 'slots'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="text-muted-foreground hidden h-4 w-4 sm:block" aria-hidden />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as ParkingSortKey)}
            aria-label="Sort parking slots"
            className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 min-h-[44px] appearance-none rounded-lg border py-2 pl-2 pr-8 text-sm focus:outline-none focus:ring-2"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
