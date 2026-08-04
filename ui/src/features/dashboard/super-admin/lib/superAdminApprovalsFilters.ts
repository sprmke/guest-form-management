import type { OrgVerificationStatus } from '@/features/dashboard/org/lib/orgVerification';
import type {
  ApprovalQueueItem,
  ExternalReviewApprovalSummary,
  OrgApprovalSummary,
  SuperAdminApprovalTypeFilter,
} from '@/features/dashboard/super-admin/types/approval';

export type SuperAdminApprovalsFilterStatus =
  OrgVerificationStatus | ExternalReviewApprovalSummary['moderationStatus'] | 'all' | 'changes';

export type SuperAdminApprovalsFilters = {
  search: string;
  status: SuperAdminApprovalsFilterStatus;
  type: SuperAdminApprovalTypeFilter;
};

export const DEFAULT_APPROVALS_FILTERS: SuperAdminApprovalsFilters = {
  search: '',
  status: 'pending',
  type: 'all',
};

function matchesTypeFilter(item: ApprovalQueueItem, type: SuperAdminApprovalTypeFilter): boolean {
  if (type === 'all') return true;
  if (type === 'reviews') return item.type === 'external_review';
  if (item.type !== 'org_verification') return false;
  if (type === 'property') return item.hostModes.includes('property');
  if (type === 'parking') return item.hostModes.includes('parking');
  return true;
}

function matchesStatusFilter(
  item: ApprovalQueueItem,
  status: SuperAdminApprovalsFilterStatus
): boolean {
  if (status === 'all') return true;

  if (item.type === 'external_review') {
    if (status === 'changes') return false;
    return item.moderationStatus === status;
  }

  const queuePending = item.baseStatus === 'pending' || item.enhancedStatus === 'pending';

  if (status === 'changes') {
    return item.baseStatus === 'rejected' && item.baseRejectionKind === 'changes';
  }
  if (status === 'rejected') {
    const baseHard = item.baseStatus === 'rejected' && item.baseRejectionKind !== 'changes';
    const enhancedHard = item.enhancedStatus === 'rejected';
    return baseHard || enhancedHard;
  }
  if (status === 'pending') {
    return queuePending;
  }
  return item.baseStatus === status || item.enhancedStatus === status;
}

export function filterSuperAdminApprovals(
  approvals: ApprovalQueueItem[],
  filters: SuperAdminApprovalsFilters
): ApprovalQueueItem[] {
  const search = filters.search.trim().toLowerCase();

  return approvals.filter((item) => {
    if (!matchesTypeFilter(item, filters.type)) return false;
    if (!matchesStatusFilter(item, filters.status)) return false;

    if (!search) return true;

    if (item.type === 'external_review') {
      const haystack = [
        item.propertyName,
        item.organizationName,
        item.reviewText,
        item.reviewerName,
        item.source,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    }

    const haystack = [item.organizationName, item.ownerName, item.ownerEmail]
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function superAdminApprovalsHasActiveFilters(filters: SuperAdminApprovalsFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.status !== DEFAULT_APPROVALS_FILTERS.status ||
    filters.type !== DEFAULT_APPROVALS_FILTERS.type
  );
}

export function isOrgApprovalSummary(item: ApprovalQueueItem): item is OrgApprovalSummary {
  return item.type === 'org_verification';
}

export function isExternalReviewApprovalSummary(
  item: ApprovalQueueItem
): item is ExternalReviewApprovalSummary {
  return item.type === 'external_review';
}

export function approvalQueueItemKey(item: ApprovalQueueItem): string {
  if (item.type === 'external_review') {
    return `review:${item.propertyId}:${item.reviewId}`;
  }
  return `org:${item.organizationId}`;
}
