import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function AdminSurfaceCard({
  className,
  children,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn('surface-card w-full px-3 py-3 sm:px-4 sm:py-4', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function AdminPageHeaderSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        compact && 'sm:items-center',
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 shrink-0 rounded" />
          <Skeleton className={cn(compact ? 'h-4 w-28' : 'h-5 w-36')} />
        </div>
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
    </div>
  );
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
        'overflow-hidden rounded-2xl border border-border/50 bg-muted/30',
        nested && 'rounded-lg bg-background/80',
      )}
    >
      <div className="flex min-h-[44px] items-center gap-3 px-3 py-2.5">
        <Skeleton className="h-4 max-w-[160px] flex-1" />
        {showBadge ? <Skeleton className="h-4 w-14 shrink-0 rounded-full" /> : null}
        <Skeleton className="size-4 shrink-0 rounded" />
      </div>
      <div className="space-y-3 border-t border-separator px-3 pb-3 pt-3 sm:space-y-4">
        {children}
      </div>
    </div>
  );
}

function ButtonRowSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg sm:w-36" />
      ))}
    </div>
  );
}

function CheckboxPanelSkeleton() {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2">
      <div className="flex min-h-[44px] items-start gap-3 py-1.5">
        <Skeleton className="mt-1 size-[18px] shrink-0 rounded" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full max-w-sm" />
        </div>
      </div>
    </div>
  );
}

function InfoBannerSkeleton() {
  return (
    <div className="flex gap-2.5 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

function TemplateEditorSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="min-h-[96px] w-full rounded-2xl" style={{ height: rows * 12 }} />
      <Skeleton className="h-11 w-full rounded-lg sm:w-36" />
    </div>
  );
}

function ScenarioSectionSkeleton() {
  return (
    <CollapsibleSectionSkeleton nested showBadge>
      <Skeleton className="h-10 w-full rounded-md" />
      <CheckboxPanelSkeleton />
      <TemplateEditorSkeleton rows={8} />
    </CollapsibleSectionSkeleton>
  );
}

function AdminFooterActionsSkeleton() {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Skeleton className="h-11 w-full rounded-lg sm:w-24" />
      <Skeleton className="h-11 w-full rounded-lg sm:w-28" />
    </div>
  );
}

export function TelegramOperationsSettingsSkeleton() {
  return (
    <AdminSurfaceCard aria-busy="true" aria-label="Loading operations settings">
      <div className="space-y-4">
        <AdminPageHeaderSkeleton />
        <CollapsibleSectionSkeleton>
          <ButtonRowSkeleton count={2} />
        </CollapsibleSectionSkeleton>
        <CollapsibleSectionSkeleton>
          <Skeleton className="h-3 w-full max-w-lg" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-16 rounded" />
            ))}
          </div>
        </CollapsibleSectionSkeleton>
        <CheckboxPanelSkeleton />
        <InfoBannerSkeleton />
        <CollapsibleSectionSkeleton>
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <ScenarioSectionSkeleton key={i} />
            ))}
          </div>
        </CollapsibleSectionSkeleton>
        <AdminFooterActionsSkeleton />
      </div>
    </AdminSurfaceCard>
  );
}

export function TelegramStaffSettingsSkeleton() {
  return (
    <AdminSurfaceCard aria-busy="true" aria-label="Loading staff settings">
      <div className="space-y-4">
        <AdminPageHeaderSkeleton />
        <CollapsibleSectionSkeleton>
          <ButtonRowSkeleton count={2} />
        </CollapsibleSectionSkeleton>
        <CollapsibleSectionSkeleton>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" style={{ maxWidth: `${90 - i * 8}%` }} />
            ))}
          </div>
        </CollapsibleSectionSkeleton>
        <CollapsibleSectionSkeleton>
          <CheckboxPanelSkeleton />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-11 w-full rounded-2xl sm:max-w-[10rem]" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
          <TemplateEditorSkeleton rows={10} />
        </CollapsibleSectionSkeleton>
        <AdminFooterActionsSkeleton />
      </div>
    </AdminSurfaceCard>
  );
}

export function TelegramMarketingSettingsSkeleton() {
  return (
    <AdminSurfaceCard aria-busy="true" aria-label="Loading marketing settings">
      <div className="space-y-4">
        <AdminPageHeaderSkeleton />
        <CollapsibleSectionSkeleton>
          <ButtonRowSkeleton count={3} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        </CollapsibleSectionSkeleton>
        <CollapsibleSectionSkeleton>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" style={{ maxWidth: `${88 - i * 6}%` }} />
            ))}
          </div>
        </CollapsibleSectionSkeleton>
        <CollapsibleSectionSkeleton>
          <CheckboxPanelSkeleton />
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-28 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        </CollapsibleSectionSkeleton>
        <CollapsibleSectionSkeleton>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-md border border-border/80 bg-background/80 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <Skeleton className="h-3 w-28" />
              <Skeleton className="col-span-full h-20 w-full rounded-2xl sm:col-span-2" />
              <Skeleton className="h-9 w-full rounded-lg sm:col-start-2 sm:row-start-1 sm:w-28" />
            </div>
          ))}
        </CollapsibleSectionSkeleton>
        <AdminFooterActionsSkeleton />
      </div>
    </AdminSurfaceCard>
  );
}

export function AppSettingsCardSkeleton() {
  return (
    <AdminSurfaceCard aria-busy="true" aria-label="Loading settings">
      <div className="space-y-4">
        <AdminPageHeaderSkeleton />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CollapsibleSectionSkeleton key={i}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-full max-w-xs" />
                  <Skeleton className="h-11 w-full rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-full max-w-sm" />
                  <Skeleton className="h-11 w-full rounded-2xl" />
                </div>
              </div>
            </CollapsibleSectionSkeleton>
          ))}
        </div>
        <div className="border-t border-separator pt-3">
          <Skeleton className="ml-auto h-11 w-full rounded-lg sm:w-32" />
        </div>
      </div>
    </AdminSurfaceCard>
  );
}

export function GmailMailIntegrationCardSkeleton() {
  return (
    <AdminSurfaceCard aria-busy="true" aria-label="Loading Gmail integration">
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
    </AdminSurfaceCard>
  );
}

function DetailCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm sm:p-5">
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Skeleton className="size-12 shrink-0 rounded-full" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-52 max-w-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            </div>
          </div>
          <DetailCardSkeleton lines={4} />
          <DetailCardSkeleton lines={2} />
          <DetailCardSkeleton lines={5} />
          <DetailCardSkeleton lines={4} />
          <DetailCardSkeleton lines={3} />
        </div>
        <div className="w-full space-y-3 lg:w-[370px] lg:shrink-0">
          <div className="rounded-xl border border-border/50 bg-card p-4">
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
    <div className="surface-card overflow-hidden" aria-busy="true" aria-label="Loading bookings">
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="flex items-center gap-4 border-b border-separator bg-muted/40 px-4 py-3 sm:px-5">
            {[56, 96, 88, 32, 40, 56, 24].map((w, i) => (
              <Skeleton
                key={i}
                className={cn(
                  'h-2.5 shrink-0 rounded-full',
                  i === 3 && 'hidden md:block',
                  i === 4 && 'hidden sm:block',
                  i === 5 && 'hidden lg:block',
                )}
                style={{ width: w }}
              />
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5',
                i > 0 && 'border-t border-separator',
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
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading bookings"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border/50 bg-card"
          style={{ opacity: 1 - i * 0.06 }}
        >
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
          <div className="flex items-center justify-between gap-2 border-t border-separator bg-muted/20 px-4 py-3 dark:bg-muted/30">
            <div className="flex gap-1.5">
              <Skeleton className="size-7 rounded-md" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BookingsCalendarSkeleton() {
  return (
    <div
      className="grid gap-3 sm:gap-4 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm dark:shadow-none lg:col-span-2">
        <div className="flex items-center justify-between border-b border-separator bg-muted/30 px-3 py-3 sm:px-4">
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-1">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-9 w-14 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 px-2 pb-1 pt-3 sm:px-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="mx-auto h-3 w-6 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 px-2 pb-3 sm:px-3">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-square rounded-lg sm:min-h-[88px] sm:aspect-auto"
            />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm dark:shadow-none">
        <div className="border-b border-separator bg-muted/30 px-4 py-3">
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
