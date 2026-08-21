import { useMemo } from 'react';

import { formatDistanceToNow } from 'date-fns';

import { useMarketingPublications } from '@/features/dashboard/marketing/lib/marketingPublishApi';

import { ListRowsSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'published') return 'default';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

export function PublishHistory() {
  const { data, isLoading } = useMarketingPublications();

  const publishedCount = useMemo(
    () => (data ?? []).filter((row) => row.status === 'published').length,
    [data]
  );

  if (isLoading) {
    return <ListRowsSkeleton rows={3} label="Loading recent publishes" className="min-h-[120px]" />;
  }

  if (!data?.length) {
    return null;
  }

  return (
    <section className="border-border bg-card space-y-2 rounded-xl border p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Recent publishes</h2>
        <span className="text-muted-foreground text-xs">{publishedCount} published</span>
      </div>

      <ScrollArea className="max-h-[240px]">
        <ul className="space-y-2 pr-2">
          {data.map((row) => (
            <li
              key={row.id}
              className="border-border flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm capitalize">
                  {row.platform} · {row.publishType}
                </p>
                {row.caption ? (
                  <p className="text-muted-foreground line-clamp-2 text-xs">{row.caption}</p>
                ) : null}
                {row.errorMessage ? (
                  <p className="text-destructive text-xs">{row.errorMessage}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={statusVariant(row.status)} className={cn('capitalize')}>
                  {row.status}
                </Badge>
                <span className="text-muted-foreground text-[11px]">
                  {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </section>
  );
}
