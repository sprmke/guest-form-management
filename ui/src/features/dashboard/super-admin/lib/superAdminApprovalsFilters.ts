import type { OrgVerificationStatus } from '@/features/dashboard/org/lib/orgVerification';
import type { OrgApprovalSummary } from '@/features/dashboard/super-admin/types/approval';

export type SuperAdminApprovalsFilterStatus = OrgVerificationStatus | 'all' | 'changes';

export type SuperAdminApprovalsFilters = {
  search: string;
  status: SuperAdminApprovalsFilterStatus;
};

export const DEFAULT_APPROVALS_FILTERS: SuperAdminApprovalsFilters = {
  search: '',
  status: 'pending',
};

export function filterSuperAdminApprovals(
  approvals: OrgApprovalSummary[],
  filters: SuperAdminApprovalsFilters
): OrgApprovalSummary[] {
  const search = filters.search.trim().toLowerCase();

  return approvals.filter((approval) => {
    if (filters.status === 'changes') {
      if (approval.baseStatus !== 'rejected' || approval.baseRejectionKind !== 'changes') {
        return false;
      }
    } else if (filters.status === 'rejected') {
      if (approval.baseStatus !== 'rejected' || approval.baseRejectionKind === 'changes') {
        return false;
      }
    } else if (filters.status !== 'all' && approval.baseStatus !== filters.status) {
      return false;
    }

    if (!search) return true;
    const haystack = [approval.organizationName, approval.ownerName, approval.ownerEmail]
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function superAdminApprovalsHasActiveFilters(filters: SuperAdminApprovalsFilters): boolean {
  return filters.search.trim() !== '' || filters.status !== DEFAULT_APPROVALS_FILTERS.status;
}
