import {
  activityCategoryLabel,
  ACTIVITY_FILTER_CATEGORIES,
  type ActivityCategory,
} from '@/features/dashboard/activity/lib/activityCatalog';

import { cn } from '@/lib/utils';

type Props = {
  selected: ReadonlySet<ActivityCategory>;
  onToggle: (category: ActivityCategory) => void;
  /** `scroll` for a single-line strip; `wrap` for sheet / popover bodies. */
  layout?: 'scroll' | 'wrap';
  className?: string;
};

export function ActivityCategoryChips({ selected, onToggle, layout = 'wrap', className }: Props) {
  const chips = ACTIVITY_FILTER_CATEGORIES.map((cat) => {
    const active = selected.has(cat);
    return (
      <button
        key={cat}
        type="button"
        onClick={() => onToggle(cat)}
        className={cn(
          'shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
          'focus-visible:ring-ring min-h-[32px] focus-visible:outline-none focus-visible:ring-2',
          active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        )}
        aria-pressed={active}
      >
        {activityCategoryLabel(cat)}
      </button>
    );
  });

  if (layout === 'scroll') {
    return (
      <div
        className={cn(
          '-mx-0.5 flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className
        )}
      >
        {chips}
      </div>
    );
  }

  return <div className={cn('flex flex-wrap gap-1.5', className)}>{chips}</div>;
}
