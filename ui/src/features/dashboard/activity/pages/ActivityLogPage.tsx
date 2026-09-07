import { useEffect, useMemo, useRef, useState } from 'react';

import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { ActivityDetailSheet } from '@/features/dashboard/activity/components/ActivityDetailSheet';
import { ActivityFilters } from '@/features/dashboard/activity/components/ActivityFilters';
import { ActivityRow } from '@/features/dashboard/activity/components/ActivityRow';
import { useActivityLog } from '@/features/dashboard/activity/hooks/useActivityLog';
import {
  downloadActivityLogCsv,
  type ActivityLogFilters,
} from '@/features/dashboard/activity/lib/activityApi';
import type { ActivityEvent } from '@/features/dashboard/activity/lib/activityCatalog';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { useOrgSlugParam, useResolvedOrgId } from '@/features/dashboard/org/lib/adminApiScope';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  scope: 'org' | 'property' | 'parking';
};

export function ActivityLogPage({ scope }: Props) {
  const propertyId = useOptionalOrgContext()?.property.id ?? null;
  const parkingId = useOptionalParkingContext()?.parking.id ?? null;

  const [filters, setFilters] = useState<ActivityLogFilters>(() => ({ scope }));

  // Lock the scope + listing id onto every request.
  const effectiveFilters = useMemo<ActivityLogFilters>(
    () => ({
      ...filters,
      scope,
      propertyId: scope === 'property' ? propertyId : undefined,
      parkingId: scope === 'parking' ? parkingId : undefined,
    }),
    [filters, scope, propertyId, parkingId]
  );

  const query = useActivityLog(effectiveFilters);
  const [selected, setSelected] = useState<ActivityEvent | null>(null);

  const orgSlug = useOrgSlugParam();
  const orgId = useResolvedOrgId();
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadActivityLogCsv({ orgSlug, orgId, filters: effectiveFilters });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const events = useMemo(() => query.data?.pages.flatMap((p) => p.events) ?? [], [query.data]);

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !query.hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      },
      { rootMargin: '400px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Activity</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleExport()}
          disabled={exporting || events.length === 0}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      <ActivityFilters filters={filters} onChange={setFilters} />

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
          Could not load activity.
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          No activity in this range.
        </div>
      ) : (
        <div className="divide-border/40 divide-y">
          {events.map((event) => (
            <ActivityRow key={event.id} event={event} onSelect={setSelected} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} />
      {query.isFetchingNextPage && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}
      {!query.hasNextPage && events.length > 0 && (
        <p className="text-muted-foreground py-2 text-center text-xs">End of activity</p>
      )}

      <ActivityDetailSheet event={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
