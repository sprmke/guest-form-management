import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import type {
  OrgApprovalDetail,
  OrgApprovalSummary,
} from '@/features/dashboard/super-admin/types/approval';

export const APPROVALS_QUERY_KEY = ['super-admin', 'approvals'] as const;

export function approvalAssetsQueryKey(orgId: string) {
  return ['super-admin', 'approval-assets', orgId] as const;
}

export function useApprovals() {
  return useQuery({
    queryKey: APPROVALS_QUERY_KEY,
    queryFn: () =>
      callEdgeFunction<{ approvals: OrgApprovalSummary[] }>('list-org-verifications').then((data) =>
        data.approvals.map((row) => ({
          ...row,
          unitConflicts: Array.isArray(row.unitConflicts) ? row.unitConflicts : [],
          hasActiveUnitConflict: row.hasActiveUnitConflict === true,
        }))
      ),
  });
}

export function useOrgVerificationAssets(orgId: string | undefined) {
  return useQuery({
    queryKey: approvalAssetsQueryKey(orgId ?? ''),
    enabled: Boolean(orgId),
    queryFn: () =>
      callEdgeFunction<OrgApprovalDetail>(
        `get-org-verification-assets?orgId=${encodeURIComponent(orgId!)}`
      ),
  });
}

export function useApproveOrgVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { orgId: string; tier?: 'base' | 'enhanced' }) =>
      callEdgeFunction('approve-org-verification', {
        method: 'POST',
        body: JSON.stringify({ orgId: input.orgId, tier: input.tier ?? 'base' }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY });
    },
  });
}

export function useRejectOrgVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      orgId: string;
      reason: string;
      kind: 'changes' | 'rejected';
      tier?: 'base' | 'enhanced';
      changesRequestedDocs?: Array<
        'validId' | 'socialProof' | 'propertyOwnership' | 'parkingProof'
      >;
    }) =>
      callEdgeFunction('reject-org-verification', {
        method: 'POST',
        body: JSON.stringify({
          orgId: input.orgId,
          reason: input.reason,
          kind: input.kind,
          tier: input.tier ?? 'base',
          ...(input.kind === 'changes' && input.changesRequestedDocs
            ? { changesRequestedDocs: input.changesRequestedDocs }
            : {}),
        }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY });
    },
  });
}
