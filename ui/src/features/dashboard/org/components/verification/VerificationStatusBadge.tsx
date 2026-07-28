import type { OrgVerificationStatus } from '@/features/dashboard/org/lib/orgVerification';
import { verificationStatusLabel } from '@/features/dashboard/org/lib/orgVerificationTiers';

import { cn } from '@/lib/utils';

type Props = {
  status: OrgVerificationStatus;
  className?: string;
};

export function VerificationStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
        status === 'approved' && 'bg-emerald-500/10 text-emerald-700',
        status === 'pending' && 'bg-amber-500/10 text-amber-800',
        status === 'rejected' && 'bg-destructive/10 text-destructive',
        status === 'none' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {verificationStatusLabel(status)}
    </span>
  );
}
