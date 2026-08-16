import {
  listingMapCanvasClass,
  listingMapMinHeightClass,
} from '@/features/guest/marketing/shared/lib/listingMapLayout';
import type { SearchViewMode } from '@/features/guest/search/components/SearchResultsToolbar';

import { cn } from '@/lib/utils';

type Props = {
  viewMode?: SearchViewMode;
};

export function SearchResultsSkeleton({ viewMode = 'grid' }: Props) {
  if (viewMode === 'list') {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="bg-muted h-24 w-28 shrink-0 animate-pulse rounded-xl sm:h-28 sm:w-36" />
            <div className="min-w-0 flex-1 space-y-3 py-1">
              <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
              <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
              <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'map') {
    return (
      <div
        className={cn(
          'bg-muted animate-pulse rounded-xl',
          listingMapCanvasClass,
          listingMapMinHeightClass
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="bg-muted aspect-square animate-pulse rounded-xl" />
          <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
          <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
