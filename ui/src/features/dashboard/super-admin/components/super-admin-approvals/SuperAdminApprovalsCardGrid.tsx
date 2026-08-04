import { AdminTableRowAffordance } from '@/features/dashboard/bookings/components/AdminDataTable';
import { VerificationStatusBadge } from '@/features/dashboard/org/components/verification/VerificationStatusBadge';
import type { OrgApprovalSummary } from '@/features/dashboard/super-admin/types/approval';

import { AdminCardGrid, AdminCardRow } from '@/components/mobile/AdminCardGrid';
import { cn } from '@/lib/utils';

function SuccessionBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800">
      Succession
    </span>
  );
}

function ConsiderationBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-800">
      Consideration
    </span>
  );
}

function hostModesLabel(hostModes: string[]): string {
  const hasProperty = hostModes.includes('property');
  const hasParking = hostModes.includes('parking');
  if (hasProperty && hasParking) return 'Property + Parking';
  if (hasParking) return 'Parking';
  return 'Property';
}

function formatSubmittedDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type Props = {
  approvals: OrgApprovalSummary[];
  onSelect: (approval: OrgApprovalSummary) => void;
};

export function SuperAdminApprovalsCardGrid({ approvals, onSelect }: Props) {
  return (
    <AdminCardGrid denser={false}>
      {approvals.map((approval) => (
        <AdminCardRow
          key={approval.organizationId}
          onOpen={() => onSelect(approval)}
          aria-label={`Review ${approval.organizationName}`}
          className="min-h-[132px] gap-3 p-3.5 sm:p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <p className="text-foreground truncate text-sm font-semibold">
                  {approval.organizationName}
                </p>
                {approval.hasActiveUnitConflict ? <SuccessionBadge /> : null}
                {approval.hasPendingConsideration ? <ConsiderationBadge /> : null}
              </div>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">{approval.ownerName}</p>
              {approval.ownerEmail ? (
                <p className="text-muted-foreground truncate text-xs">{approval.ownerEmail}</p>
              ) : null}
            </div>
            <AdminTableRowAffordance />
          </div>

          <div className="border-border/50 mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <span className="text-muted-foreground text-xs">
              {hostModesLabel(approval.hostModes)}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn('text-muted-foreground text-xs tabular-nums')}>
                {formatSubmittedDate(approval.baseSubmittedAt)}
              </span>
              <VerificationStatusBadge
                status={approval.baseStatus}
                kind={approval.baseRejectionKind}
              />
            </div>
          </div>
        </AdminCardRow>
      ))}
    </AdminCardGrid>
  );
}
