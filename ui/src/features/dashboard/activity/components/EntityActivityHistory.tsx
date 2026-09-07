import { useMemo, useState } from 'react';

import { ActivityDetailSheet } from '@/features/dashboard/activity/components/ActivityDetailSheet';
import { ActivityRow } from '@/features/dashboard/activity/components/ActivityRow';
import { useActivityLog } from '@/features/dashboard/activity/hooks/useActivityLog';
import type { ActivityEvent } from '@/features/dashboard/activity/lib/activityCatalog';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  /** e.g. "booking", "property", "member", "expense" */
  targetType: string;
  targetId: string;
  className?: string;
  /** Rows shown before "Show more". */
  initialLimit?: number;
};

/** Compact activity feed for one entity — embed in a booking / settings / member detail page. */
export function EntityActivityHistory({
  targetType,
  targetId,
  className,
  initialLimit = 6,
}: Props) {
  const query = useActivityLog({ targetType, targetId });
  const [selected, setSelected] = useState<ActivityEvent | null>(null);
  const [expanded, setExpanded] = useState(false);

  const events = useMemo(() => query.data?.pages.flatMap((p) => p.events) ?? [], [query.data]);
  const visible = expanded ? events : events.slice(0, initialLimit);

  return (
    <section className={className}>
      <h3 className="mb-2 text-sm font-medium">Activity</h3>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-muted-foreground text-sm">Could not load activity.</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-sm">No recorded activity yet.</p>
      ) : (
        <div className="divide-border/40 -mx-3 divide-y">
          {visible.map((event) => (
            <ActivityRow key={event.id} event={event} onSelect={setSelected} />
          ))}
        </div>
      )}

      {!expanded && events.length > initialLimit && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1"
          onClick={() => {
            setExpanded(true);
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
        >
          Show more
        </Button>
      )}

      <ActivityDetailSheet event={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </section>
  );
}
