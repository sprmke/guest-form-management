import { SlidersHorizontal, LayoutGrid, List, Map, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list' | 'map';

interface PropertiesToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalResults: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'newest', label: 'Newest' },
];

const viewModes: { value: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { value: 'grid', icon: LayoutGrid, label: 'Grid view' },
  { value: 'list', icon: List, label: 'List view' },
  { value: 'map', icon: Map, label: 'Map view' },
];

export function PropertiesToolbar({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  totalResults,
  filtersOpen,
  onToggleFilters,
}: PropertiesToolbarProps) {
  return (
    <div className="border-border bg-background border-b">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className={cn(
              'hidden gap-2 lg:flex',
              filtersOpen && 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>

          <span className="text-muted-foreground text-sm">
            <span className="text-foreground font-semibold">{totalResults}</span>{' '}
            {totalResults === 1 ? 'property' : 'properties'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden sm:block">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-muted-foreground h-4 w-4" aria-hidden />
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 appearance-none rounded-lg border py-2 pl-2 pr-8 text-sm focus:outline-none focus:ring-2"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-border bg-muted/50 flex rounded-lg border p-1">
            {viewModes.map((mode) => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => onViewModeChange(mode.value)}
                  className={cn(
                    'min-h-[44px] min-w-[44px] rounded-md p-2 transition-all',
                    isActive
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-label={mode.label}
                  title={mode.label}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
