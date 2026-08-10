import type { CSSProperties } from 'react';

import { AdminMetricCardSkeleton } from '@/features/dashboard/bookings/components/AdminMetricCard';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function AdminSurfaceCard({ className, children, ...props }: React.ComponentProps<'section'>) {
  return (
    <section className={cn('mb-3 w-full', className)} {...props}>
      {children}
    </section>
  );
}

function AdminPageHeaderSkeleton({
  compact = false,
  card,
}: {
  compact?: boolean;
  /** Wrap in surface card. Defaults to true for `compact`. */
  card?: boolean;
}) {
  const useCard = card ?? compact;

  const content = (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        compact && 'sm:items-center'
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex items-center">
          <Skeleton className="h-6 w-32 sm:h-7 sm:w-36" />
        </div>
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </div>
  );

  if (!useCard) {
    return content;
  }

  return <section className="mb-3 w-full">{content}</section>;
}

function CollapsibleSectionSkeleton({
  nested = false,
  showBadge = false,
  children,
}: {
  nested?: boolean;
  showBadge?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'border-border/50 bg-muted/30 overflow-hidden rounded-xl border',
        nested && 'bg-background/80 rounded-lg'
      )}
    >
      <div className="flex min-h-[44px] items-center gap-3 px-3 py-2.5">
        <Skeleton className="h-4 max-w-[160px] flex-1" />
        {showBadge ? <Skeleton className="h-4 w-14 shrink-0 rounded-full" /> : null}
        <Skeleton className="size-4 shrink-0 rounded" />
      </div>
      <div className="border-separator space-y-3 border-t px-3 pb-3 pt-3 sm:space-y-4">
        {children}
      </div>
    </div>
  );
}

export function AppSettingsCardSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4" aria-busy="true" aria-label="Loading settings">
      <AdminPageHeaderSkeleton compact />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CollapsibleSectionSkeleton key={i}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-full max-w-xs" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-full max-w-sm" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
          </CollapsibleSectionSkeleton>
        ))}
      </div>
      <div className="border-separator border-t pt-3">
        <Skeleton className="ml-auto h-11 w-full rounded-lg sm:w-32" />
      </div>
    </div>
  );
}

export function GmailMailIntegrationCardSkeleton({ embedded = false }: { embedded?: boolean }) {
  const inner = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg sm:size-11" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-full max-w-md" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Skeleton className="h-11 w-full rounded-lg sm:w-36" />
        <Skeleton className="h-11 w-full rounded-lg sm:w-32" />
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading Gmail integration"
        className="bg-muted/20 rounded-lg px-3 py-3"
      >
        {inner}
      </div>
    );
  }

  return (
    <AdminSurfaceCard aria-busy="true" aria-label="Loading Gmail integration">
      {inner}
    </AdminSurfaceCard>
  );
}

function DetailCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="border-border/50 bg-card rounded-xl border p-4 shadow-sm sm:p-5">
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingDetailPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading booking">
      <Skeleton className="h-3 w-28" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5 lg:gap-6">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="border-border/50 bg-card rounded-xl border p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-3 w-52 max-w-full" />
                <Skeleton className="h-3 w-36 max-w-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-28 rounded-full" />
                <Skeleton className="h-10 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <DetailCardSkeleton lines={4} />
          <DetailCardSkeleton lines={2} />
          <DetailCardSkeleton lines={5} />
          <DetailCardSkeleton lines={4} />
          <DetailCardSkeleton lines={3} />
        </div>
        <div className="w-full space-y-3 md:w-[min(100%,20rem)] md:shrink-0 xl:w-[370px]">
          <div className="border-border/50 bg-card rounded-xl border p-4">
            <Skeleton className="mb-4 h-4 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="size-6 shrink-0 rounded-full" />
                  <Skeleton className="h-3 flex-1" style={{ maxWidth: `${100 - i * 8}%` }} />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-11 w-full rounded-lg" />
          </div>
          <DetailCardSkeleton lines={2} />
        </div>
      </div>
    </div>
  );
}

export function BookingsTableSkeleton() {
  return (
    <div
      className="surface-card surface-card-clip overflow-hidden"
      aria-busy="true"
      aria-label="Loading bookings"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="border-separator bg-card flex items-center gap-4 border-b px-4 py-3 sm:px-5">
            {[56, 96, 88, 32, 40, 56, 24].map((w, i) => (
              <Skeleton
                key={i}
                className={cn(
                  'h-2.5 shrink-0 rounded-full',
                  i === 3 && 'hidden md:block',
                  i === 4 && 'hidden sm:block',
                  i === 5 && 'hidden lg:block'
                )}
                style={{ width: w }}
              />
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'bg-card flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5',
                i > 0 && 'border-separator border-t'
              )}
              style={{ opacity: 1 - i * 0.08 }}
            >
              <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32 max-w-full" />
                  <Skeleton className="h-2.5 w-40 max-w-full" />
                </div>
              </div>
              <Skeleton className="hidden h-3 w-28 shrink-0 md:block" />
              <Skeleton className="hidden h-3 w-8 shrink-0 md:block" />
              <div className="hidden shrink-0 gap-1.5 sm:flex">
                <Skeleton className="size-7 rounded-md" />
              </div>
              <Skeleton className="hidden h-3 w-14 shrink-0 lg:block" />
              <Skeleton className="ml-auto size-9 shrink-0 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BookingsCardGridSkeleton() {
  return (
    <div
      className="native-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading bookings"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="surface-card overflow-hidden" style={{ opacity: 1 - i * 0.06 }}>
          {/* Phone list skeleton */}
          <div className="flex items-start gap-3 p-3.5 sm:hidden">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          </div>
          {/* sm+ card skeleton */}
          <div className="hidden sm:block">
            <div className="space-y-4 p-4 pb-3">
              <Skeleton className="h-6 w-28 rounded-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
            <div className="space-y-2 px-4 pb-3">
              <Skeleton className="h-2.5 w-10" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="border-separator bg-muted/20 dark:bg-muted/30 flex items-center justify-between gap-2 border-t px-4 py-3">
              <Skeleton className="size-7 rounded-md" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinanceKpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn(
        'grid gap-2 sm:gap-3 lg:gap-4',
        count === 3 && 'grid-cols-2 sm:grid-cols-3',
        count === 4 && 'grid-cols-2 lg:grid-cols-4',
        count === 2 && 'grid-cols-2'
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <AdminMetricCardSkeleton key={i} style={{ opacity: 1 - i * 0.05 } as CSSProperties} />
      ))}
    </div>
  );
}

export function FinanceOverviewSkeleton() {
  return (
    <div
      className="space-y-3 sm:space-y-4 lg:space-y-5"
      aria-busy="true"
      aria-label="Loading finance overview"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <FinanceKpiGridSkeleton count={4} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full max-w-md" />
        <FinanceKpiGridSkeleton count={4} />
      </div>
    </div>
  );
}

export function FinanceStaysCardGridSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading stays"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="border-border/50 bg-card rounded-xl border p-3.5 sm:p-4"
          style={{ opacity: 1 - i * 0.06 }}
        >
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="mt-2 h-3.5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full max-w-[14rem]" />
          <Skeleton className="mt-1.5 size-7 rounded-md" />
          <div className="border-separator mt-3 grid grid-cols-2 gap-3 border-t pt-3">
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-3.5 w-16" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="ml-auto h-2.5 w-12" />
              <Skeleton className="ml-auto h-3.5 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinanceStaysTableSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading stays ledger">
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="border-separator bg-card flex items-center gap-4 border-b px-4 py-3">
              {[56, 120, 88, 40, 56, 48, 48, 40].map((w, i) => (
                <Skeleton key={i} className="h-2.5 shrink-0 rounded-full" style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'bg-card flex items-center gap-3 px-4 py-4',
                  i > 0 && 'border-separator border-t'
                )}
                style={{ opacity: 1 - i * 0.08 }}
              >
                <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32 max-w-full" />
                    <Skeleton className="h-2.5 w-40 max-w-full" />
                  </div>
                </div>
                <Skeleton className="hidden h-8 w-28 md:block" />
                <Skeleton className="hidden size-7 rounded-md sm:block" />
                <Skeleton className="hidden h-3 w-16 lg:block" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="hidden h-3 w-14 sm:block" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-xl" />
          <Skeleton className="size-11 rounded-xl" />
          <Skeleton className="size-11 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function FinanceOperatingTabSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading transactions">
      <FinanceKpiGridSkeleton count={3} />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-11 w-28 rounded-xl" />
      </div>
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="border-separator bg-card flex items-center gap-4 border-b px-4 py-3">
              {[48, 40, 120, 64, 56].map((w, i) => (
                <Skeleton
                  key={i}
                  className={cn('h-2.5 shrink-0 rounded-full', i === 2 && 'flex-1')}
                  style={{ width: i === 2 ? undefined : w }}
                />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'bg-card flex items-center gap-3 px-4 py-3.5',
                  i > 0 && 'border-separator border-t'
                )}
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 max-w-[180px] flex-1" />
                <Skeleton className="hidden h-3 w-16 md:block" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingsCalendarSkeleton({
  gridOnly = false,
  compact = false,
}: {
  gridOnly?: boolean;
  compact?: boolean;
} = {}) {
  const cellClass = compact
    ? 'min-h-8 w-full rounded-md'
    : 'aspect-square w-full rounded-lg sm:min-h-[88px] sm:aspect-auto';
  const gridPad = compact ? 'gap-0.5 px-1.5 pb-1.5 pt-1 sm:px-2' : 'gap-1 px-2 pb-3 pt-3 sm:px-3';

  const grid = (
    <div
      className={
        gridOnly
          ? 'overflow-hidden'
          : 'border-border/50 bg-card overflow-hidden rounded-xl border shadow-sm lg:col-span-2 dark:shadow-none'
      }
    >
      {!gridOnly || !compact ? (
        <div className="border-separator bg-muted/30 flex items-center justify-between border-b px-3 py-3 sm:px-4">
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-1">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-9 w-14 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
        </div>
      ) : null}
      <div className={cn('grid grid-cols-7', gridPad)}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`dow-${i}`} className="mx-auto h-3 w-6 rounded-full" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={`day-${i}`} className={cellClass} />
        ))}
      </div>
    </div>
  );

  if (gridOnly) {
    return (
      <div aria-busy="true" aria-label="Loading calendar">
        {grid}
      </div>
    );
  }

  return (
    <div
      className="grid gap-3 sm:gap-4 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading calendar"
    >
      {grid}
      <div className="border-border/50 bg-card overflow-hidden rounded-xl border shadow-sm dark:shadow-none">
        <div className="border-separator bg-muted/30 border-b px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-1.5 h-3 w-32" />
        </div>
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
      </div>
    </div>
  );
}

type DashboardCardHeaderAction = 'toggle' | 'view' | 'badge' | 'segment';

function DashboardChartCardHeaderSkeleton({
  action,
  titleWidthClass = 'w-28',
  descriptionWidthClass = 'w-40',
}: {
  action?: DashboardCardHeaderAction;
  titleWidthClass?: string;
  descriptionWidthClass?: string;
}) {
  return (
    <div className="mb-2.5 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Skeleton className="icon-well-sm !size-8 shrink-0 !rounded-lg lg:!size-10 lg:!rounded-xl" />
        <div className="min-w-0 space-y-1">
          <Skeleton className={cn('h-4 lg:h-5', titleWidthClass)} />
          <Skeleton className={cn('hidden h-3 max-w-full lg:block', descriptionWidthClass)} />
        </div>
      </div>
      {action === 'toggle' ? (
        <Skeleton className="h-9 w-[7.25rem] shrink-0 rounded-lg" />
      ) : action === 'view' ? (
        <Skeleton className="h-9 w-14 shrink-0 rounded-lg" />
      ) : action === 'badge' ? (
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      ) : action === 'segment' ? (
        <Skeleton className="h-9 w-36 shrink-0 rounded-lg" />
      ) : null}
    </div>
  );
}

function DashboardTrendStatCardSkeleton() {
  return <AdminMetricCardSkeleton showTrend />;
}

function DashboardListRowSkeleton({ tall = false }: { tall?: boolean }) {
  return <Skeleton className={cn('w-full rounded-xl', tall ? 'h-14' : 'h-12')} />;
}

export function DashboardSkeleton() {
  return (
    <div
      className="native-stagger flex min-w-0 flex-col gap-2.5 sm:gap-3 lg:gap-4"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <section aria-hidden>
        <Skeleton className="section-eyebrow mb-2 hidden h-3 w-28 px-0.5 sm:mb-3 lg:block" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardTrendStatCardSkeleton key={`trend-${i}`} />
          ))}
        </div>
      </section>

      <div className="grid min-w-0 items-stretch gap-2.5 sm:gap-3 lg:grid-cols-2 lg:gap-4">
        {/* Calendar | Needs attention */}
        <section className="surface-card flex h-full min-w-0 flex-col overflow-hidden p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton
            action="toggle"
            titleWidthClass="w-24"
            descriptionWidthClass="w-52"
          />
          <div className="grid grid-cols-7 gap-0.5 px-0.5 pb-1 pt-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={`dow-${i}`} className="mx-auto h-3 w-6 rounded-full" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={`day-${i}`} className="min-h-8 w-full rounded-md" />
            ))}
          </div>
        </section>

        <section className="surface-card flex h-full min-w-0 flex-col overflow-hidden p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton
            action="badge"
            titleWidthClass="w-32"
            descriptionWidthClass="w-44"
          />
          <div className="border-border/50 mb-3 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="border-border/50 overflow-hidden rounded-xl border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`attn-${i}`}
                className={cn('px-3 py-2.5', i > 0 && 'border-border/50 border-t')}
              >
                <Skeleton className="h-4 w-full" style={{ opacity: 1 - i * 0.1 }} />
              </div>
            ))}
          </div>
        </section>

        {/* Cash flow | Breakdown */}
        <section className="surface-card flex h-full min-w-0 flex-col p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton
            action="view"
            titleWidthClass="w-24"
            descriptionWidthClass="w-48"
          />
          <Skeleton className="h-[180px] w-full min-w-0 rounded-xl sm:h-[220px]" />
        </section>

        <section className="surface-card flex h-full min-w-0 flex-col p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton action="segment" titleWidthClass="w-28" />
          <div className="flex min-h-[180px] flex-1 items-center justify-center px-2 sm:min-h-[220px]">
            <Skeleton className="size-36 shrink-0 rounded-full sm:size-44" />
          </div>
        </section>

        {/* Maintenance | Transactions */}
        <section className="surface-card flex h-full min-w-0 flex-col overflow-hidden p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton
            action="view"
            titleWidthClass="w-28"
            descriptionWidthClass="w-36"
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <DashboardListRowSkeleton key={`maint-${i}`} tall />
            ))}
          </div>
        </section>

        <section className="surface-card flex h-full min-w-0 flex-col overflow-hidden p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton
            action="view"
            titleWidthClass="w-28"
            descriptionWidthClass="w-40"
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <DashboardListRowSkeleton key={`txn-${i}`} tall />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Org dashboard — KPI strip + 2×2 board + listings list. */
export function OrgDashboardSkeleton() {
  return (
    <div
      className="native-stagger flex min-w-0 flex-col gap-2.5 sm:gap-3 lg:gap-4"
      aria-busy="true"
      aria-label="Loading organization dashboard"
    >
      <section aria-hidden>
        <Skeleton className="section-eyebrow mb-2 hidden h-3 w-28 px-0.5 sm:mb-3 lg:block" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardTrendStatCardSkeleton key={`org-trend-${i}`} />
          ))}
        </div>
      </section>

      <div className="grid min-w-0 items-stretch gap-2.5 sm:gap-3 lg:grid-cols-2 lg:gap-4">
        <section className="surface-card flex h-full min-w-0 flex-col p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton action="segment" titleWidthClass="w-32" />
          <Skeleton className="h-[180px] w-full min-w-0 rounded-xl sm:h-[220px]" />
        </section>

        <section className="surface-card flex h-full min-w-0 flex-col p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton titleWidthClass="w-28" />
          <div className="flex min-h-[220px] flex-1 items-center justify-center sm:min-h-[260px]">
            <Skeleton className="size-40 shrink-0 rounded-full sm:size-48" />
          </div>
        </section>

        <section className="surface-card flex h-full min-w-0 flex-col overflow-hidden p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton action="view" titleWidthClass="w-32" />
          <div className="border-border/50 overflow-hidden rounded-xl border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`org-recent-${i}`}
                className={cn('px-3 py-2.5', i > 0 && 'border-border/50 border-t')}
              >
                <Skeleton className="h-3.5 w-full" style={{ opacity: 1 - i * 0.1 }} />
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card flex h-full min-w-0 flex-col overflow-hidden p-3 sm:p-4">
          <DashboardChartCardHeaderSkeleton action="view" titleWidthClass="w-28" />
          <div className="border-border/50 overflow-hidden rounded-xl border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`org-pending-${i}`}
                className={cn('px-3 py-2.5', i > 0 && 'border-border/50 border-t')}
              >
                <Skeleton className="h-4 w-full" style={{ opacity: 1 - i * 0.1 }} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface-card min-w-0 overflow-hidden p-3 sm:p-4">
        <DashboardChartCardHeaderSkeleton action="segment" titleWidthClass="w-40" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardListRowSkeleton key={`org-listing-${i}`} tall />
          ))}
        </div>
      </section>
    </div>
  );
}
