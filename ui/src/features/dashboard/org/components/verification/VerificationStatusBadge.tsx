import { AlertCircle, Check, Circle, Clock } from 'lucide-react';

import type { OrgVerificationStatus } from '@/features/dashboard/org/lib/orgVerification';
import type { OrgVerificationRejectionKind } from '@/features/dashboard/org/lib/orgVerificationTiers';
import { verificationStatusLabel } from '@/features/dashboard/org/lib/orgVerificationTiers';

import { cn } from '@/lib/utils';

type Props = {
  status: OrgVerificationStatus;
  kind?: OrgVerificationRejectionKind | null;
  className?: string;
  /** Show a leading status icon (tier tabs, headers). */
  showIcon?: boolean;
};

function StatusIcon({
  status,
  isChangesRequested,
}: {
  status: OrgVerificationStatus;
  isChangesRequested: boolean;
}) {
  const className = 'size-3 shrink-0';

  if (status === 'approved') {
    return <Check className={className} strokeWidth={2.5} aria-hidden />;
  }
  if (status === 'pending') {
    return <Clock className={className} strokeWidth={2.25} aria-hidden />;
  }
  if (status === 'rejected') {
    return <AlertCircle className={className} strokeWidth={2.25} aria-hidden />;
  }
  if (isChangesRequested) {
    return <AlertCircle className={className} strokeWidth={2.25} aria-hidden />;
  }
  return <Circle className={className} strokeWidth={2.25} aria-hidden />;
}

export function VerificationStatusBadge({
  status,
  kind = null,
  className,
  showIcon = false,
}: Props) {
  const isChangesRequested = status === 'rejected' && kind === 'changes';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
        status === 'approved' && 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
        status === 'pending' && 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
        isChangesRequested && 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
        status === 'rejected' &&
          !isChangesRequested &&
          'bg-destructive/15 text-destructive dark:text-red-300',
        status === 'none' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {showIcon ? <StatusIcon status={status} isChangesRequested={isChangesRequested} /> : null}
      {verificationStatusLabel(status, kind)}
    </span>
  );
}
