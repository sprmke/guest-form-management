import {
  ORG_SOCIAL_PROOF_PLATFORMS,
  ORG_VERIFICATION_RIGHTS,
  ORG_VERIFICATION_STATUSES,
  type OrgSocialProofPlatform,
  type OrgVerificationRights,
  type OrgVerificationStatus,
} from '@/features/dashboard/org/lib/orgVerification';

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
  assets: OrgVerificationAssets;
  verifiedBadge: boolean;
};

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
      assets: { ...EMPTY_ASSETS, pmoEmailPaths: [] },
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

  const enhancedStatus = asStatus(v.enhancedStatus);

  return {
    baseStatus: asStatus(v.baseStatus),
    enhancedStatus,
    socialPlatform: asPlatform(v.socialPlatform),
    propertyRelationship: asRights(v.propertyRelationship),
    propertyContractEndDate: asPath(v.propertyContractEndDate),
    parkingRelationship: asRights(v.parkingRelationship),
    parkingContractEndDate: asPath(v.parkingContractEndDate),
    baseSubmittedAt: asPath(v.baseSubmittedAt),
    enhancedSubmittedAt: asPath(v.enhancedSubmittedAt),
    assets: {
      validIdPath: asPath(assetsRaw.validIdPath),
      socialProofPath: asPath(assetsRaw.socialProofPath),
      propertyOwnershipProofPath: asPath(assetsRaw.propertyOwnershipProofPath),
      parkingSocialProofPath: asPath(assetsRaw.parkingSocialProofPath),
      selfieWithIdPath: asPath(assetsRaw.selfieWithIdPath),
      ownershipProofPath: asPath(assetsRaw.ownershipProofPath),
      pmoEmailPaths,
    },
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
  if (detail.baseStatus === 'rejected') return 'Verification issue';
  if (detail.enhancedStatus === 'none') return 'Get Verified badge';
  return 'Get Verified';
}

export function verificationStatusLabel(status: OrgVerificationStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'pending':
      return 'In review';
    case 'rejected':
      return 'Needs update';
    default:
      return 'Not started';
  }
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
