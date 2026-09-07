import { Search, X } from 'lucide-react';

import type { ActivityLogFilters } from '@/features/dashboard/activity/lib/activityApi';
import {
  activityCategoryLabel,
  ACTIVITY_FILTER_CATEGORIES,
  type ActivityCategory,
} from '@/features/dashboard/activity/lib/activityCatalog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  filters: ActivityLogFilters;
  onChange: (next: ActivityLogFilters) => void;
};

export function ActivityFilters({ filters, onChange }: Props) {
  const activeCategories = new Set(filters.category ?? []);
  const destructiveOnly = filters.severity === 'destructive';
  const hasAny =
    activeCategories.size > 0 ||
    destructiveOnly ||
    Boolean(filters.q) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  const toggleCategory = (cat: ActivityCategory) => {
    const next = new Set(activeCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onChange({ ...filters, category: [...next] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={filters.q ?? ''}
            onChange={(e) => onChange({ ...filters, q: e.target.value || null })}
            placeholder="Search activity"
            className="pl-8"
            aria-label="Search activity"
          />
        </div>
        <Button
          type="button"
          variant={destructiveOnly ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => onChange({ ...filters, severity: destructiveOnly ? null : 'destructive' })}
        >
          Destructive only
        </Button>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dateFrom?.slice(0, 10) ?? ''}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || null })}
            className="w-[9.5rem]"
            aria-label="From date"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={filters.dateTo?.slice(0, 10) ?? ''}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value || null })}
            className="w-[9.5rem]"
            aria-label="To date"
          />
        </div>
        {hasAny && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ scope: filters.scope })}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ACTIVITY_FILTER_CATEGORIES.map((cat) => {
          const active = activeCategories.has(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={cn(
                'min-h-[32px] rounded-full border px-2.5 py-1 text-xs transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              )}
              aria-pressed={active}
            >
              {activityCategoryLabel(cat)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
