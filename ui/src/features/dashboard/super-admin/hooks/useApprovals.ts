import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  orgVerificationAssetsQueryKey,
  useOrgVerificationAssets,
} from '@/features/dashboard/org/hooks/useOrgVerificationAssets';
import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import type {
  ApprovalQueueItem,
  ExternalReviewApprovalSummary,
  OrgApprovalSummary,
} from '@/features/dashboard/super-admin/types/approval';

export const APPROVALS_QUERY_KEY = ['super-admin', 'approvals'] as const;

export function approvalAssetsQueryKey(orgId: string) {
  return orgVerificationAssetsQueryKey(orgId);
}

export { useOrgVerificationAssets };

function normalizeOrgApproval(row: Omit<OrgApprovalSummary, 'type'>): OrgApprovalSummary {
  return {
    type: 'org_verification',
    ...row,
    unitConflicts: Array.isArray(row.unitConflicts) ? row.unitConflicts : [],
    hasActiveUnitConflict: row.hasActiveUnitConflict === true,
    propertyConsiderationStatus: row.propertyConsiderationStatus ?? 'none',
    parkingConsiderationStatus: row.parkingConsiderationStatus ?? 'none',
    hasPendingConsideration: row.hasPendingConsideration === true,
    propertyAccessLocked: row.propertyAccessLocked === true,
    parkingAccessLocked: row.parkingAccessLocked === true,
  };
}

function normalizeExternalReviewApproval(
  row: ExternalReviewApprovalSummary
): ExternalReviewApprovalSummary {
  return {
    type: 'external_review',
    propertyId: row.propertyId,
    propertyName: row.propertyName,
    propertySlug: row.propertySlug,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    reviewId: row.reviewId,
    source: row.source === 'facebook' ? 'facebook' : 'airbnb',
    reviewText: row.reviewText ?? '',
    reviewerName: row.reviewerName ?? '',
    starRating: row.starRating ?? null,
    moderationStatus:
      row.moderationStatus === 'approved' || row.moderationStatus === 'rejected'
        ? row.moderationStatus
        : 'pending',
    submittedAt: row.submittedAt ?? null,
    imageUrl: row.imageUrl ?? null,
    proofUrl: row.proofUrl ?? null,
    stayPhotoUrls: Array.isArray(row.stayPhotoUrls)
      ? row.stayPhotoUrls.filter(
          (url): url is string => typeof url === 'string' && url.trim().length > 0
        )
      : [],
    imagePath: row.imagePath ?? null,
  };
}

export function useApprovals() {
  return useQuery({
    queryKey: APPROVALS_QUERY_KEY,
    queryFn: () =>
      callEdgeFunction<{ approvals: ApprovalQueueItem[] }>('list-super-admin-approvals').then(
        (data) =>
          (data.approvals ?? []).map((row) => {
            if (row.type === 'external_review') {
              return normalizeExternalReviewApproval(row);
            }
            return normalizeOrgApproval(row as Omit<OrgApprovalSummary, 'type'>);
          })
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

export function useDecideContractConsideration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      orgId: string;
      leg: 'property' | 'parking';
      decision: 'grant' | 'deny' | 'changes';
      note?: string;
      grantedUntil?: string;
      allowConsiderationOverride?: boolean;
    }) =>
      callEdgeFunction('decide-contract-consideration', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY });
    },
  });
}

export function externalReviewAssetsQueryKey(propertyId: string, reviewId: string) {
  return ['super-admin', 'external-review-assets', propertyId, reviewId] as const;
}

export function useExternalReviewAssets(propertyId: string | null, reviewId: string | null) {
  return useQuery({
    queryKey: externalReviewAssetsQueryKey(propertyId ?? '', reviewId ?? ''),
    enabled: Boolean(propertyId && reviewId),
    queryFn: () =>
      callEdgeFunction<{
        imageUrl: string | null;
        stayPhotoUrls: string[];
        proofUrl: string | null;
      }>(
        `get-external-review-assets?propertyId=${encodeURIComponent(propertyId!)}&reviewId=${encodeURIComponent(reviewId!)}`
      ),
  });
}

export function useModerateExternalReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      propertyId: string;
      reviewId: string;
      decision: 'approved' | 'rejected';
    }) =>
      callEdgeFunction('moderate-external-review', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY });
    },
  });
}
