import { AdminTableRowAffordance } from '@/features/dashboard/bookings/components/AdminDataTable';
import { VerificationStatusBadge } from '@/features/dashboard/org/components/verification/VerificationStatusBadge';
import { externalReviewSourceLabel } from '@/features/dashboard/org/lib/propertyExternalReviews';
import {
  approvalHasDualTierQueue,
  latestApprovalSubmittedAt,
} from '@/features/dashboard/super-admin/lib/approvalReviewTier';
import {
  approvalQueueItemKey,
  isOrgApprovalSummary,
} from '@/features/dashboard/super-admin/lib/superAdminApprovalsFilters';
import type { ApprovalQueueItem } from '@/features/dashboard/super-admin/types/approval';

import { AdminCardGrid, AdminCardRow } from '@/components/mobile/AdminCardGrid';
import { cn } from '@/lib/utils';
import { softBadgeClasses, toneBadgeClasses } from '@/lib/status-tone-colors';

function SuccessionBadge() {
  return <span className={softBadgeClasses('warning')}>Succession</span>;
}

function ConsiderationBadge() {
  return <span className={softBadgeClasses('info')}>Consideration</span>;
}

function ReviewBadge() {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
        toneBadgeClasses('purple')
      )}
    >
      Review
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
  approvals: ApprovalQueueItem[];
  onSelect: (approval: ApprovalQueueItem) => void;
};

export function SuperAdminApprovalsCardGrid({ approvals, onSelect }: Props) {
  return (
    <AdminCardGrid denser={false}>
      {approvals.map((approval) => {
        const isReview = approval.type === 'external_review';
        const label = isReview ? approval.propertyName : approval.organizationName;
        const ariaLabel = isReview
          ? `Review ${approval.propertyName} external review`
          : `Review ${approval.organizationName}`;

        return (
          <AdminCardRow
            key={approvalQueueItemKey(approval)}
            onOpen={() => onSelect(approval)}
            aria-label={ariaLabel}
            className="min-h-[132px] gap-3 p-3.5 sm:p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <p className="text-foreground truncate text-sm font-semibold">{label}</p>
                  {isReview ? <ReviewBadge /> : null}
                  {!isReview && approval.hasActiveUnitConflict ? <SuccessionBadge /> : null}
                  {!isReview && approval.hasPendingConsideration ? <ConsiderationBadge /> : null}
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {isReview ? approval.organizationName : approval.ownerName}
                </p>
                {!isReview && approval.ownerEmail ? (
                  <p className="text-muted-foreground truncate text-xs">{approval.ownerEmail}</p>
                ) : null}
                {isReview ? (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {approval.reviewText}
                  </p>
                ) : null}
              </div>
              <AdminTableRowAffordance />
            </div>

            <div className="border-border/50 mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <span className="text-muted-foreground text-xs">
                {isReview
                  ? externalReviewSourceLabel(approval.source)
                  : hostModesLabel(approval.hostModes)}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn('text-muted-foreground text-xs tabular-nums')}>
                  {formatSubmittedDate(
                    isReview ? approval.submittedAt : latestApprovalSubmittedAt(approval)
                  )}
                </span>
                {isReview ? (
                  <VerificationStatusBadge status={approval.moderationStatus} />
                ) : (
                  <OrgApprovalQueueStatusCell approval={approval} />
                )}
              </div>
            </div>
          </AdminCardRow>
        );
      })}
    </AdminCardGrid>
  );
}

function OrgApprovalQueueStatusCell({
  approval,
}: {
  approval: Extract<ApprovalQueueItem, { type: 'org_verification' }>;
}) {
  if (!isOrgApprovalSummary(approval)) return null;

  if (approvalHasDualTierQueue(approval)) {
    return (
      <div className="flex flex-col items-end gap-1 whitespace-nowrap">
        <div className="flex flex-nowrap items-center gap-1.5">
          <span className="text-muted-foreground shrink-0 text-[10px] font-semibold uppercase tracking-wide">
            Verified
          </span>
          <VerificationStatusBadge status={approval.baseStatus} kind={approval.baseRejectionKind} />
        </div>
        <div className="flex flex-nowrap items-center gap-1.5">
          <span className="text-muted-foreground shrink-0 text-[10px] font-semibold uppercase tracking-wide">
            Recommended
          </span>
          <VerificationStatusBadge status={approval.enhancedStatus} />
        </div>
      </div>
    );
  }

  const status =
    approval.enhancedStatus === 'pending' ? approval.enhancedStatus : approval.baseStatus;
  const kind = approval.enhancedStatus === 'pending' ? null : approval.baseRejectionKind;

  return <VerificationStatusBadge status={status} kind={kind} />;
}
