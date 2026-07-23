import { ORG_PROPERTY_STATUSES } from '@/features/dashboard/org/lib/orgPropertyDisplay';

import { cn } from '@/lib/utils';

type Props = {
  status: string;
  className?: string;
};

export function OrgPropertyStatusBadge({ status, className }: Props) {
  const config = ORG_PROPERTY_STATUSES.find((entry) => entry.value === status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        config?.badgeClassName ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-white/90" aria-hidden />
      {config?.label ?? status}
    </span>
  );
}
