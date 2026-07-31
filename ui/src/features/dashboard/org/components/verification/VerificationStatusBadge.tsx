import type { OrgVerificationStatus } from '@/features/dashboard/org/lib/orgVerification';
import type { OrgVerificationRejectionKind } from '@/features/dashboard/org/lib/orgVerificationTiers';
import { verificationStatusLabel } from '@/features/dashboard/org/lib/orgVerificationTiers';

import { cn } from '@/lib/utils';

type Props = {
  status: OrgVerificationStatus;
  kind?: OrgVerificationRejectionKind | null;
  className?: string;
};

export function VerificationStatusBadge({ status, kind = null, className }: Props) {
  const isChangesRequested = status === 'rejected' && kind === 'changes';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
        status === 'approved' && 'bg-emerald-500/10 text-emerald-700',
        status === 'pending' && 'bg-amber-500/10 text-amber-800',
        isChangesRequested && 'bg-orange-500/10 text-orange-800',
        status === 'rejected' && !isChangesRequested && 'bg-destructive/10 text-destructive',
        status === 'none' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {verificationStatusLabel(status, kind)}
    </span>
  );
}
