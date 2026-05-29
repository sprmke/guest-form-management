import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { KameFormBrandHeader } from '@/components/KameFormBrandHeader';

export function GuestFormStepperSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card px-3 py-4 sm:px-5"
      aria-hidden
    >
      <div className="space-y-1.5 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <ol className="hidden w-full items-start justify-between sm:flex">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="contents">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            {i < 3 ? (
              <div className="flex shrink-0 items-center self-start pt-4">
                <Skeleton className="h-0.5 w-6 rounded-full md:w-10" />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function GuestFormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-11 w-full rounded-2xl" />
    </div>
  );
}

export function GuestFormStepPanelSkeleton({
  fieldCount = 4,
  twoColumn = true,
}: {
  fieldCount?: number;
  twoColumn?: boolean;
}) {
  return (
    <div className="space-y-5 rounded-xl border border-border/80 bg-card px-4 py-5 shadow-sm sm:px-6 sm:py-6">
      <header className="flex items-center gap-3 border-b border-separator pb-4">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
      </header>
      <div
        className={cn(
          'grid gap-4',
          twoColumn && 'grid-cols-1 md:grid-cols-2 md:[&>*]:min-w-0',
        )}
      >
        {Array.from({ length: fieldCount }).map((_, i) => (
          <GuestFormFieldSkeleton key={i} />
        ))}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-separator pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-full rounded-2xl sm:w-28" />
        <Skeleton className="h-11 w-full rounded-2xl sm:w-32" />
      </div>
    </div>
  );
}

export function GuestFormPageSkeleton({ title }: { title?: string }) {
  return (
    <div
      className="relative space-y-6 p-4 sm:p-6 lg:p-8"
      aria-busy="true"
      aria-label="Loading form"
    >
      <KameFormBrandHeader title={title} />
      <GuestFormStepperSkeleton />
      <GuestFormStepPanelSkeleton fieldCount={4} />
    </div>
  );
}

export function CalendarAvailabilitySkeleton() {
  return (
    <div className="flex w-full justify-center" aria-busy="true" aria-label="Loading calendar">
      <div className="availability-calendar w-full max-w-md overflow-hidden rounded-2xl border border-border/50 bg-card p-3 sm:p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-1">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="mx-auto h-3 w-6 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CalendarPageSkeleton() {
  return (
    <div className="relative min-w-0 space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
      <KameFormBrandHeader title="Check Availability" />
      <CalendarAvailabilitySkeleton />
      <div className="surface-muted rounded-2xl border border-primary/15 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
          <Skeleton className="h-11 w-full rounded-2xl sm:w-40" />
        </div>
      </div>
    </div>
  );
}

export function SdFormPageSkeleton({ title }: { title: string }) {
  return (
    <div className="relative space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true" aria-label="Loading form">
      <KameFormBrandHeader title={title} />
      <GuestFormStepperSkeleton />
      <GuestFormStepPanelSkeleton fieldCount={3} twoColumn={false} />
    </div>
  );
}

export function PayParkingPageSkeleton({ title }: { title: string }) {
  return (
    <div className="relative space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true" aria-label="Loading form">
      <KameFormBrandHeader title={title} />
      <div className="space-y-4 rounded-xl border border-border/80 bg-card px-4 py-5 shadow-sm sm:px-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full max-w-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <GuestFormFieldSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-2xl sm:ml-auto sm:w-40" />
      </div>
    </div>
  );
}
