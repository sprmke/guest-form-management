import { useCallback, useEffect, useRef } from 'react';

import { Loader2, Search } from 'lucide-react';

import { InboxFilterBar } from '@/features/dashboard/inbox/components/InboxFilterBar';
import { InboxThreadListEmpty } from '@/features/dashboard/inbox/components/InboxThreadListEmpty';
import { InboxThreadRow } from '@/features/dashboard/inbox/components/InboxThreadRow';
import type {
  InboxConversation,
  ThreadPlatformFilter,
  ThreadStatusFilter,
} from '@/features/dashboard/inbox/types/inbox';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  conversations: InboxConversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  platformFilter: ThreadPlatformFilter;
  statusFilter: ThreadStatusFilter;
  search: string;
  onStatusFilter: (v: ThreadStatusFilter) => void;
  onSearch: (v: string) => void;
  emptyVariant?:
    | 'not-connected'
    | 'syncing'
    | 'sync-error'
    | 'load-error'
    | 'empty'
    | 'search-not-loaded'
    | 'search-empty';
  syncError?: string | null;
  loadError?: string | null;
  canConnect?: boolean;
  onConnect?: () => void;
  onRetryLoad?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  canLoadOlderFromMeta?: boolean;
  onLoadOlderFromMeta?: () => void;
};

export function InboxThreadList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  platformFilter,
  statusFilter,
  search,
  onStatusFilter,
  onSearch,
  emptyVariant = 'empty',
  syncError = null,
  loadError = null,
  canConnect = false,
  onConnect,
  onRetryLoad,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  canLoadOlderFromMeta = false,
  onLoadOlderFromMeta,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(loadingMore);
  loadingMoreRef.current = loadingMore;

  const handleLoadMore = useCallback(() => {
    if (!onLoadMore || loadingMoreRef.current) return;
    onLoadMore();
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollRoot = scrollRef.current;
    if (!sentinel || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMoreRef.current) {
          handleLoadMore();
        }
      },
      { root: scrollRoot, rootMargin: '120px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, handleLoadMore, conversations.length]);

  return (
    <div className="bg-card flex h-full min-h-0 flex-col">
      <div className="border-border/80 shrink-0 space-y-2.5 border-b p-3">
        <div className="relative">
          <Search
            className="text-muted-foreground/70 pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search messages"
            className="border-border/60 bg-background/80 h-10 pl-9 shadow-none focus-visible:ring-1"
            aria-label="Search messages"
          />
        </div>
        <InboxFilterBar statusFilter={statusFilter} onStatusFilter={onStatusFilter} />
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <InboxThreadListEmpty
            variant={emptyVariant}
            syncError={syncError}
            loadError={loadError}
            canConnect={canConnect}
            onConnect={onConnect}
            onRetryLoad={onRetryLoad}
            canLoadOlderFromMeta={canLoadOlderFromMeta}
            onLoadOlderFromMeta={onLoadOlderFromMeta}
            loadingOlderFromMeta={loadingMore}
          />
        ) : (
          <div className="py-1">
            {conversations.map((c) => (
              <InboxThreadRow
                key={c.id}
                conversation={c}
                selected={c.id === selectedId}
                showPlatform={platformFilter === 'all'}
                onSelect={() => onSelect(c.id)}
              />
            ))}
            {(hasMore || (loadingMore && !canLoadOlderFromMeta)) && (
              <div
                ref={sentinelRef}
                className="flex min-h-[48px] items-center justify-center px-3 py-3"
                role="status"
                aria-live="polite"
                aria-busy={loadingMore}
              >
                {loadingMore && (
                  <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden />
                )}
              </div>
            )}
            {canLoadOlderFromMeta ? (
              <div className="flex justify-center px-3 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 min-h-[44px] px-3"
                  disabled={loadingMore}
                  onClick={onLoadOlderFromMeta}
                >
                  {loadingMore ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    'Load older from Meta'
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
