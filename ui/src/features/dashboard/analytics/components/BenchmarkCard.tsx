import { Gauge } from 'lucide-react';

import type { PlatformBenchmark } from '@/features/dashboard/analytics/lib/types';

import { AdminSurfaceCardHeader } from '@/components/shared/AdminSurfaceCardHeader';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format/currency';

type Props = {
  benchmark: PlatformBenchmark;
  ownOccupancyRatePct: number;
  className?: string;
};

function percentileNote(percentile: number | null): string {
  if (percentile === null) return '';
  if (percentile >= 75) return 'top quarter';
  if (percentile >= 50) return 'above the median';
  if (percentile >= 25) return 'below the median';
  return 'bottom quarter';
}

export function BenchmarkCard({ benchmark, ownOccupancyRatePct, className }: Props) {
  if (!benchmark.available) return null;

  return (
    <section
      className={cn(
        'surface-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4',
        className
      )}
    >
      <AdminSurfaceCardHeader
        icon={Gauge}
        title="How you compare"
        description={`Against ${benchmark.sampleSize} other active Pro listings this period`}
        iconClassName="bg-muted/80"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground text-xs font-medium">Occupancy</p>
          <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
            {Math.round(ownOccupancyRatePct)}%
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Median{' '}
            {benchmark.medianOccupancyRate !== null ? `${benchmark.medianOccupancyRate}%` : '-'}
            {benchmark.occupancyPercentile !== null
              ? ` — ${percentileNote(benchmark.occupancyPercentile)} (${benchmark.occupancyPercentile}th percentile)`
              : ''}
          </p>
        </div>

        {benchmark.medianAdr !== null ? (
          <div>
            <p className="text-muted-foreground text-xs font-medium">ADR</p>
            <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
              {formatMoney(benchmark.medianAdr)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Platform median
              {benchmark.adrPercentile !== null
                ? ` — you're ${percentileNote(benchmark.adrPercentile)} (${benchmark.adrPercentile}th percentile)`
                : ''}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
