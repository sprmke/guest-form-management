import {
  ORG_SOCIAL_PROOF_PLATFORMS,
  ORG_VERIFICATION_RIGHTS,
  ORG_VERIFICATION_STATUSES,
  validateVerificationContractEndDate,
  verificationRightsNeedsContractEnd,
  type OrgSocialProofPlatform,
  type OrgVerificationRights,
  type OrgVerificationStatus,
} from '@/features/dashboard/org/lib/orgVerification';
import {
  emptyContractLegLifecycle,
  parseContractLegLifecycle,
  type ContractLegLifecycle,
} from '@/features/dashboard/org/lib/contractLifecycle';

export type { ContractLegLifecycle } from '@/features/dashboard/org/lib/contractLifecycle';

export type OrgVerificationRejectionKind = 'changes' | 'rejected';

export type OrgVerificationAssets = {
  validIdPath: string | null;
  socialProofPath: string | null;
  propertyOwnershipProofPath: string | null;
  parkingSocialProofPath: string | null;
  selfieWithIdPath: string | null;
  ownershipProofPath: string | null;
  pmoEmailPaths: string[];
};

export type OrgVerificationDetail = {
  baseStatus: OrgVerificationStatus;
  enhancedStatus: OrgVerificationStatus;
  socialPlatform: OrgSocialProofPlatform | null;
  propertyRelationship: OrgVerificationRights | null;
  propertyContractEndDate: string | null;
  parkingRelationship: OrgVerificationRights | null;
  parkingContractEndDate: string | null;
  baseSubmittedAt: string | null;
  enhancedSubmittedAt: string | null;
  baseRejectionReason: string | null;
  enhancedRejectionReason: string | null;
  baseRejectionKind: OrgVerificationRejectionKind | null;
  enhancedRejectionKind: OrgVerificationRejectionKind | null;
  /** When kind=changes, which docs must be re-uploaded. Empty = show all (legacy). */
  baseChangesRequestedDocs: OrgVerificationChangeDocId[];
  assets: OrgVerificationAssets;
  propertyLifecycle: ContractLegLifecycle;
  parkingLifecycle: ContractLegLifecycle;
  verifiedBadge: boolean;
};

export type OrgVerificationChangeDocId =
  'validId' | 'socialProof' | 'propertyOwnership' | 'parkingProof';

const CHANGE_DOC_IDS: readonly OrgVerificationChangeDocId[] = [
  'validId',
  'socialProof',
  'propertyOwnership',
  'parkingProof',
];

function asChangesRequestedDocs(value: unknown): OrgVerificationChangeDocId[] {
  if (!Array.isArray(value)) return [];
  const out: OrgVerificationChangeDocId[] = [];
  for (const item of value) {
    if (
      typeof item === 'string' &&
      (CHANGE_DOC_IDS as readonly string[]).includes(item) &&
      !out.includes(item as OrgVerificationChangeDocId)
    ) {
      out.push(item as OrgVerificationChangeDocId);
    }
  }
  return out;
}

export type VerificationChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
  optional?: boolean;
};

export type VerificationTierDefinition = {
  id: 'host' | 'verified';
  level: number;
  title: string;
  benefit: string;
  status: OrgVerificationStatus;
};

const LEGACY_RIGHTS_MAP: Record<string, OrgVerificationRights> = {
  owner: 'property_owner',
  renter: 'authorized_representative',
  sublessee: 'sublessee',
};

function asStatus(value: unknown): OrgVerificationStatus {
  if (
    typeof value === 'string' &&
    ORG_VERIFICATION_STATUSES.includes(value as OrgVerificationStatus)
  ) {
    return value as OrgVerificationStatus;
  }
  return 'none';
}

function asPlatform(value: unknown): OrgSocialProofPlatform | null {
  if (typeof value === 'string' && ORG_SOCIAL_PROOF_PLATFORMS.some((p) => p.value === value)) {
    return value as OrgSocialProofPlatform;
  }
  return null;
}

function asPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asRejectionKind(value: unknown): OrgVerificationRejectionKind | null {
  if (value === 'changes' || value === 'rejected') return value;
  if (value === 'compliance') return 'changes';
  return null;
}

function asRights(value: unknown): OrgVerificationRights | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (ORG_VERIFICATION_RIGHTS.some((r) => r.value === trimmed)) {
    return trimmed as OrgVerificationRights;
  }
  return LEGACY_RIGHTS_MAP[trimmed] ?? null;
}

const EMPTY_ASSETS: OrgVerificationAssets = {
  validIdPath: null,
  socialProofPath: null,
  propertyOwnershipProofPath: null,
  parkingSocialProofPath: null,
  selfieWithIdPath: null,
  ownershipProofPath: null,
  pmoEmailPaths: [],
};

export function readOrgVerificationDetail(
  settings: Record<string, unknown> | null | undefined
): OrgVerificationDetail {
  const raw = settings?.verification;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      baseStatus: 'none',
      enhancedStatus: 'none',
      socialPlatform: null,
      propertyRelationship: null,
      propertyContractEndDate: null,
      parkingRelationship: null,
      parkingContractEndDate: null,
      baseSubmittedAt: null,
      enhancedSubmittedAt: null,
      baseRejectionReason: null,
      enhancedRejectionReason: null,
      baseRejectionKind: null,
      enhancedRejectionKind: null,
      baseChangesRequestedDocs: [],
      assets: { ...EMPTY_ASSETS, pmoEmailPaths: [] },
      propertyLifecycle: emptyContractLegLifecycle(),
      parkingLifecycle: emptyContractLegLifecycle(),
      verifiedBadge: false,
    };
  }

  const v = raw as Record<string, unknown>;
  const assetsRaw =
    v.assets && typeof v.assets === 'object' && !Array.isArray(v.assets)
      ? (v.assets as Record<string, unknown>)
      : {};
  const pmoRaw = assetsRaw.pmoEmailPaths;
  const pmoEmailPaths = Array.isArray(pmoRaw)
    ? pmoRaw
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .map((p) => p.trim())
    : [];

  const baseStatus = asStatus(v.baseStatus);
  const enhancedStatus = asStatus(v.enhancedStatus);

  return {
    baseStatus,
    enhancedStatus,
    socialPlatform: asPlatform(v.socialPlatform),
    propertyRelationship: asRights(v.propertyRelationship),
    propertyContractEndDate: asPath(v.propertyContractEndDate),
    parkingRelationship: asRights(v.parkingRelationship),
    parkingContractEndDate: asPath(v.parkingContractEndDate),
    baseSubmittedAt: asPath(v.baseSubmittedAt),
    enhancedSubmittedAt: asPath(v.enhancedSubmittedAt),
    baseRejectionReason: asPath(v.baseRejectionReason),
    enhancedRejectionReason: asPath(v.enhancedRejectionReason),
    baseRejectionKind:
      baseStatus === 'rejected' ? (asRejectionKind(v.baseRejectionKind) ?? 'rejected') : null,
    enhancedRejectionKind:
      enhancedStatus === 'rejected'
        ? (asRejectionKind(v.enhancedRejectionKind) ?? 'rejected')
        : null,
    baseChangesRequestedDocs:
      baseStatus === 'rejected' && asRejectionKind(v.baseRejectionKind) === 'changes'
        ? asChangesRequestedDocs(v.baseChangesRequestedDocs)
        : [],
    assets: {
      validIdPath: asPath(assetsRaw.validIdPath),
      socialProofPath: asPath(assetsRaw.socialProofPath),
      propertyOwnershipProofPath: asPath(assetsRaw.propertyOwnershipProofPath),
      parkingSocialProofPath: asPath(assetsRaw.parkingSocialProofPath),
      selfieWithIdPath: asPath(assetsRaw.selfieWithIdPath),
      ownershipProofPath: asPath(assetsRaw.ownershipProofPath),
      pmoEmailPaths,
    },
    propertyLifecycle: parseContractLegLifecycle(v.propertyLifecycle),
    parkingLifecycle: parseContractLegLifecycle(v.parkingLifecycle),
    verifiedBadge: enhancedStatus === 'approved',
  };
}

function rightsLabel(value: OrgVerificationRights | null): string | null {
  if (!value) return null;
  return ORG_VERIFICATION_RIGHTS.find((entry) => entry.value === value)?.label ?? null;
}

function platformLabel(value: OrgSocialProofPlatform | null): string | null {
  if (!value) return null;
  return ORG_SOCIAL_PROOF_PLATFORMS.find((entry) => entry.value === value)?.label ?? null;
}

export function resolveHostModes(org: { hostModes?: string[] } | null): string[] {
  const modes = org?.hostModes?.filter((m) => m === 'property' || m === 'parking') ?? [];
  return modes.length > 0 ? modes : ['property'];
}

export function buildHostTierChecklist(
  detail: OrgVerificationDetail,
  hostModes: string[]
): VerificationChecklistItem[] {
  const needsProperty = hostModes.includes('property');
  const needsParking = hostModes.includes('parking');
  const items: VerificationChecklistItem[] = [
    {
      id: 'valid-id',
      label: 'Valid ID',
      complete: Boolean(detail.assets.validIdPath),
    },
  ];

  if (needsProperty) {
    const rights = rightsLabel(detail.propertyRelationship);
    items.push(
      {
        id: 'property-rights',
        label: rights ? `Property rights · ${rights}` : 'Property rights',
        complete: Boolean(detail.propertyRelationship),
      },
      {
        id: 'property-ownership',
        label: 'Property ownership or management proof',
        complete: Boolean(detail.assets.propertyOwnershipProofPath),
      },
      {
        id: 'property-access',
        label: platformLabel(detail.socialPlatform)
          ? `${platformLabel(detail.socialPlatform)} access screenshot`
          : 'Listing access screenshot',
        complete: Boolean(detail.assets.socialProofPath),
      }
    );
    if (detail.propertyContractEndDate) {
      items.push({
        id: 'property-contract',
        label: `Property contract end · ${detail.propertyContractEndDate}`,
        complete: true,
      });
    }
  }

  if (needsParking) {
    const rights = rightsLabel(detail.parkingRelationship);
    items.push(
      {
        id: 'parking-rights',
        label: rights ? `Parking rights · ${rights}` : 'Parking rights',
        complete: Boolean(detail.parkingRelationship),
      },
      {
        id: 'parking-proof',
        label: 'Parking ownership or management proof',
        complete: Boolean(detail.assets.parkingSocialProofPath),
      }
    );
    if (detail.parkingContractEndDate) {
      items.push({
        id: 'parking-contract',
        label: `Parking contract end · ${detail.parkingContractEndDate}`,
        complete: true,
      });
    }
  }

  return items;
}

export function buildVerifiedTierChecklist(
  detail: OrgVerificationDetail
): VerificationChecklistItem[] {
  return [
    {
      id: 'selfie',
      label: 'Selfie with valid ID',
      complete: Boolean(detail.assets.selfieWithIdPath),
    },
    {
      id: 'ownership',
      label: 'Ownership or sublease proof',
      complete: Boolean(detail.assets.ownershipProofPath),
    },
    {
      id: 'pmo-1',
      label: 'Azure PMO email screenshot',
      complete: detail.assets.pmoEmailPaths.length >= 1,
    },
    {
      id: 'pmo-2',
      label: 'Second PMO screenshot',
      complete: detail.assets.pmoEmailPaths.length >= 2,
      optional: true,
    },
  ];
}

export function buildVerificationTiers(
  detail: OrgVerificationDetail
): VerificationTierDefinition[] {
  return [
    {
      id: 'host',
      level: 1,
      title: 'Host',
      benefit: 'Required to host on Kame Homes',
      status: detail.baseStatus,
    },
    {
      id: 'verified',
      level: 2,
      title: 'Verified',
      benefit: 'Verified badge on your host page and listings',
      status: detail.enhancedStatus,
    },
  ];
}

export function countApprovedTiers(detail: OrgVerificationDetail): number {
  let count = 0;
  if (detail.baseStatus === 'approved') count += 1;
  if (detail.enhancedStatus === 'approved') count += 1;
  return count;
}

export function verificationSidebarLabel(detail: OrgVerificationDetail): string {
  if (detail.enhancedStatus === 'approved') return 'Verified';
  if (detail.enhancedStatus === 'pending') return 'Badge in review';
  if (detail.enhancedStatus === 'rejected') return 'Resubmit badge';
  if (detail.baseStatus === 'pending') return 'Verification in review';
  if (detail.baseStatus === 'rejected') {
    return detail.baseRejectionKind === 'changes' ? 'Changes requested' : 'Verification declined';
  }
  if (detail.enhancedStatus === 'none') return 'Get Verified badge';
  return 'Get Verified';
}

export function verificationStatusLabel(
  status: OrgVerificationStatus,
  kind?: OrgVerificationRejectionKind | null
): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'pending':
      return 'In review';
    case 'rejected':
      return kind === 'changes' ? 'Changes requested' : 'Declined';
    default:
      return 'Not started';
  }
}

/** Hard reject from Super Admin — blocks dashboard access; host must start a new application. */
export function isHostVerificationHardRejectedFromDetail(detail: OrgVerificationDetail): boolean {
  return detail.baseStatus === 'rejected' && detail.baseRejectionKind === 'rejected';
}

export function isHostVerificationHardRejected(
  settings: Record<string, unknown> | null | undefined
): boolean {
  return isHostVerificationHardRejectedFromDetail(readOrgVerificationDetail(settings));
}

/** Soft reject — host keeps dashboard access but must resubmit via forced Get Verified modal. */
export function isHostVerificationChangesRequestedFromDetail(
  detail: OrgVerificationDetail
): boolean {
  return detail.baseStatus === 'rejected' && detail.baseRejectionKind === 'changes';
}

export function isHostVerificationChangesRequested(
  settings: Record<string, unknown> | null | undefined
): boolean {
  return isHostVerificationChangesRequestedFromDetail(readOrgVerificationDetail(settings));
}

export function canSubmitVerifiedTier(
  detail: OrgVerificationDetail,
  slots: {
    selfie: boolean;
    ownership: boolean;
    pmo: boolean;
  }
): boolean {
  if (detail.enhancedStatus === 'approved' || detail.enhancedStatus === 'pending') {
    return false;
  }
  return slots.selfie && slots.ownership && slots.pmo;
}

/** Client-side gate for Tier 1 resubmit after rejection (mirrors server `canSubmitBaseVerification`). */
export function canSubmitHostTier(
  detail: OrgVerificationDetail,
  hostModes: string[],
  slots: {
    validId: boolean;
    socialProof: boolean;
    propertyOwnership: boolean;
    parkingProof: boolean;
    socialPlatform: OrgSocialProofPlatform | '';
    propertyRights: OrgVerificationRights | '';
    propertyContractEndDate: string;
    parkingRights: OrgVerificationRights | '';
    parkingContractEndDate: string;
  },
  options?: { changesRequestedDocs?: OrgVerificationChangeDocId[] | null }
): boolean {
  if (detail.baseStatus === 'approved' || detail.baseStatus === 'pending') {
    return false;
  }
  // Hard reject: host must start a new application — no in-app resubmit.
  if (isHostVerificationHardRejectedFromDetail(detail)) {
    return false;
  }

  const modes = hostModes.length > 0 ? hostModes : ['property'];
  const needsProperty = modes.includes('property');
  const needsParking = modes.includes('parking');
  const docs = options?.changesRequestedDocs?.filter(Boolean) ?? [];

  // Soft reject with a specific doc list — only those uploads are required.
  if (docs.length > 0) {
    if (docs.includes('validId') && !slots.validId) return false;
    if (docs.includes('socialProof')) {
      if (!slots.socialProof || !slots.socialPlatform) return false;
    }
    if (docs.includes('propertyOwnership') && !slots.propertyOwnership) return false;
    if (docs.includes('parkingProof') && !slots.parkingProof) return false;
    return true;
  }

  if (!slots.validId) return false;

  if (needsProperty) {
    if (
      !slots.socialProof ||
      !slots.propertyOwnership ||
      !slots.socialPlatform ||
      !slots.propertyRights
    ) {
      return false;
    }
    if (
      verificationRightsNeedsContractEnd(slots.propertyRights) &&
      validateVerificationContractEndDate(slots.propertyContractEndDate) !== null
    ) {
      return false;
    }
  }

  if (needsParking) {
    if (!slots.parkingProof || !slots.parkingRights) return false;
    if (
      verificationRightsNeedsContractEnd(slots.parkingRights) &&
      validateVerificationContractEndDate(slots.parkingContractEndDate) !== null
    ) {
      return false;
    }
  }

  return true;
}
