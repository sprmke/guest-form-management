import { Loader2 } from 'lucide-react';

import { AdminMetricCardSkeleton } from '@/features/dashboard/bookings/components/AdminMetricCard';

import { cn } from '@/lib/utils';

type Props = {
  /** When set, shows header + metric skeleton row before the spinner. */
  metricCount?: number;
  className?: string;
};

export function SuperAdminPageLoading({ metricCount = 0, className }: Props) {
  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {metricCount > 0 ? (
        <>
          <div className="bg-muted/60 h-14 animate-pulse rounded-xl" />
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {Array.from({ length: metricCount }).map((_, index) => (
              <AdminMetricCardSkeleton key={index} />
            ))}
          </div>
        </>
      ) : null}
      <div className="flex justify-center py-12">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    </div>
  );
}
