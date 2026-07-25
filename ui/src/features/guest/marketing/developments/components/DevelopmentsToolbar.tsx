import { SlidersHorizontal, Grid3X3, LayoutList, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DevelopmentViewMode = 'grid' | 'list';

interface DevelopmentsToolbarProps {
  viewMode: DevelopmentViewMode;
  onViewModeChange: (mode: DevelopmentViewMode) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalResults: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  /** Singular noun for the count label (default: development) */
  resultsNoun?: string;
}

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

export function DevelopmentsToolbar({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  totalResults,
  filtersOpen,
  onToggleFilters,
  resultsNoun = 'development',
}: DevelopmentsToolbarProps) {
  return (
    <div className="border-border bg-background border-b">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Left: Filters toggle + count */}
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
            <SlidersHorizontal className="h-4 w-4" />
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>

          <span className="text-muted-foreground text-sm">
            <span className="text-foreground font-semibold">{totalResults}</span>{' '}
            {totalResults === 1 ? resultsNoun : `${resultsNoun}s`}
          </span>
        </div>

        {/* Right: Sort + View mode */}
        <div className="flex items-center gap-2">
          {/* Sort dropdown (native select for simplicity) */}
          <div className="relative hidden sm:block">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="border-border bg-background text-foreground focus:ring-primary appearance-none rounded-lg border py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>

          {/* View mode toggle */}
          <div className="border-border flex overflow-hidden rounded-lg border">
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'flex items-center justify-center p-2 text-sm transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                'border-border flex items-center justify-center border-l p-2 text-sm transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
