import type { IntegrationFieldSource } from '@/features/dashboard/bookings/hooks/useAppSettings';

import { cn } from '@/lib/utils';

const SOURCE_LABEL: Record<IntegrationFieldSource, string> = {
  db: 'Property',
  none: 'Missing',
};

const SOURCE_CLASS: Record<IntegrationFieldSource, string> = {
  db: 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  none: 'border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
};

export function IntegrationSourceBadge({
  source,
  configured,
  className,
}: {
  source: IntegrationFieldSource;
  configured?: boolean;
  className?: string;
}) {
  const effectiveSource = configured === false ? 'none' : source;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        SOURCE_CLASS[effectiveSource],
        className
      )}
    >
      {SOURCE_LABEL[effectiveSource]}
    </span>
  );
}
