/**
 * Organization host verification — settings shape + helpers.
 * Asset files live in private bucket org-verification-assets (paths only in settings).
 */

import {
  contractLegLifecycleToSettingsValue,
  emptyContractLegLifecycle,
  parseContractLegLifecycle,
  type ContractLegLifecycle,
} from './contractLifecycle.ts';

export type { ContractLegLifecycle } from './contractLifecycle.ts';

export const ORG_VERIFICATION_BUCKET = 'org-verification-assets';

export const ORG_VERIFICATION_STATUSES = ['none', 'pending', 'approved', 'rejected'] as const;
export type OrgVerificationStatus = (typeof ORG_VERIFICATION_STATUSES)[number];

/** How a `rejected` status was decided — changes = request resubmit with notes; rejected = deny with reason. */
export const ORG_VERIFICATION_REJECTION_KINDS = ['changes', 'rejected'] as const;
export type OrgVerificationRejectionKind = (typeof ORG_VERIFICATION_REJECTION_KINDS)[number];

export const ORG_SOCIAL_PROOF_PLATFORMS = ['facebook', 'instagram', 'airbnb'] as const;
export type OrgSocialProofPlatform = (typeof ORG_SOCIAL_PROOF_PLATFORMS)[number];

export const ORG_VERIFICATION_RIGHTS = [
  'property_owner',
  'authorized_representative',
  'sublessee',
  'property_admin',
] as const;
export type OrgVerificationRights = (typeof ORG_VERIFICATION_RIGHTS)[number];

/** @deprecated Use ORG_VERIFICATION_RIGHTS */
export const ORG_PARKING_RELATIONSHIPS = ORG_VERIFICATION_RIGHTS;

/** @deprecated Use OrgVerificationRights */
export type OrgParkingRelationship = OrgVerificationRights;

const LEGACY_RIGHTS_MAP: Record<string, OrgVerificationRights> = {
  owner: 'property_owner',
  renter: 'authorized_representative',
  sublessee: 'sublessee',
};

export function verificationRightsNeedsContractEnd(
  rights: OrgVerificationRights | null | undefined
): boolean {
  return rights === 'authorized_representative' || rights === 'sublessee';
}

/** @deprecated Use verificationRightsNeedsContractEnd */
export function parkingRelationshipNeedsContractEnd(
  relationship: OrgVerificationRights | null | undefined
): boolean {
  return verificationRightsNeedsContractEnd(relationship);
}

export function todayManilaYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

export function validateVerificationContractEndDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Contract end date is required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'Enter a valid date';
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Enter a valid date';
  if (trimmed < todayManilaYmd()) return 'End date cannot be in the past';
  return null;
}

/** @deprecated Use validateVerificationContractEndDate */
export function validateParkingContractEndDate(value: string): string | null {
  return validateVerificationContractEndDate(value);
}

export const ORG_VERIFICATION_ASSET_TYPES = [
  'valid_id',
  'social_proof',
  'property_ownership_proof',
  'parking_social_proof',
  'selfie_with_id',
  'ownership_proof',
  'pmo_email_1',
  'pmo_email_2',
] as const;
export type OrgVerificationAssetType = (typeof ORG_VERIFICATION_ASSET_TYPES)[number];

export type OrgVerificationAssets = {
  validIdPath: string | null;
  socialProofPath: string | null;
  propertyOwnershipProofPath: string | null;
  parkingSocialProofPath: string | null;
  selfieWithIdPath: string | null;
  ownershipProofPath: string | null;
  pmoEmailPaths: string[];
};

/** Docs Super Admin can flag for re-upload on “Request changes”. */
export const ORG_VERIFICATION_CHANGE_DOC_IDS = [
  'validId',
  'socialProof',
  'propertyOwnership',
  'parkingProof',
] as const;
export type OrgVerificationChangeDocId = (typeof ORG_VERIFICATION_CHANGE_DOC_IDS)[number];

function asChangeDocId(value: unknown): OrgVerificationChangeDocId | null {
  if (
    typeof value === 'string' &&
    (ORG_VERIFICATION_CHANGE_DOC_IDS as readonly string[]).includes(value)
  ) {
    return value as OrgVerificationChangeDocId;
  }
  return null;
}

export function asChangesRequestedDocs(value: unknown): OrgVerificationChangeDocId[] {
  if (!Array.isArray(value)) return [];
  const out: OrgVerificationChangeDocId[] = [];
  for (const item of value) {
    const id = asChangeDocId(item);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export type OrgVerificationState = {
  baseStatus: OrgVerificationStatus;
  enhancedStatus: OrgVerificationStatus;
  socialPlatform: OrgSocialProofPlatform | null;
  parkingSocialPlatform: OrgSocialProofPlatform | null;
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
  /** When kind=changes, which Tier 1 docs the host must re-upload. Empty = all (legacy). */
  baseChangesRequestedDocs: OrgVerificationChangeDocId[];
  assets: OrgVerificationAssets;
  /** Unit handoff Phase B — property-leg contract expiry lifecycle. */
  propertyLifecycle: ContractLegLifecycle;
  /** Unit handoff Phase B — parking-leg contract expiry lifecycle. */
  parkingLifecycle: ContractLegLifecycle;
};

const EMPTY_ASSETS: OrgVerificationAssets = {
  validIdPath: null,
  socialProofPath: null,
  propertyOwnershipProofPath: null,
  parkingSocialProofPath: null,
  selfieWithIdPath: null,
  ownershipProofPath: null,
  pmoEmailPaths: [],
};

export function emptyOrgVerificationState(): OrgVerificationState {
  return {
    baseStatus: 'none',
    enhancedStatus: 'none',
    socialPlatform: null,
    parkingSocialPlatform: null,
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
  };
}

function asRejectionKind(value: unknown): OrgVerificationRejectionKind | null {
  if (value === 'changes' || value === 'rejected') return value;
  // Legacy value from early approvals UI
  if (value === 'compliance') return 'changes';
  return null;
}

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
  if (
    typeof value === 'string' &&
    ORG_SOCIAL_PROOF_PLATFORMS.includes(value as OrgSocialProofPlatform)
  ) {
    return value as OrgSocialProofPlatform;
  }
  return null;
}

function asPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asVerificationRights(value: unknown): OrgVerificationRights | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (ORG_VERIFICATION_RIGHTS.includes(trimmed as OrgVerificationRights)) {
    return trimmed as OrgVerificationRights;
  }
  return LEGACY_RIGHTS_MAP[trimmed] ?? null;
}

export function readOrgVerificationFromSettings(
  settings: Record<string, unknown> | null | undefined
): OrgVerificationState {
  const raw = settings?.verification;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyOrgVerificationState();
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

  return {
    baseStatus: asStatus(v.baseStatus),
    enhancedStatus: asStatus(v.enhancedStatus),
    socialPlatform: asPlatform(v.socialPlatform),
    parkingSocialPlatform: asPlatform(v.parkingSocialPlatform),
    propertyRelationship: asVerificationRights(v.propertyRelationship),
    propertyContractEndDate: asPath(v.propertyContractEndDate),
    parkingRelationship: asVerificationRights(v.parkingRelationship),
    parkingContractEndDate: asPath(v.parkingContractEndDate),
    baseSubmittedAt: asPath(v.baseSubmittedAt),
    enhancedSubmittedAt: asPath(v.enhancedSubmittedAt),
    baseRejectionReason: asPath(v.baseRejectionReason),
    enhancedRejectionReason: asPath(v.enhancedRejectionReason),
    baseRejectionKind:
      asStatus(v.baseStatus) === 'rejected'
        ? (asRejectionKind(v.baseRejectionKind) ?? 'rejected')
        : null,
    enhancedRejectionKind:
      asStatus(v.enhancedStatus) === 'rejected'
        ? (asRejectionKind(v.enhancedRejectionKind) ?? 'rejected')
        : null,
    baseChangesRequestedDocs:
      asStatus(v.baseStatus) === 'rejected' && asRejectionKind(v.baseRejectionKind) === 'changes'
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
  };
}

export function orgVerificationToSettingsValue(
  state: OrgVerificationState
): Record<string, unknown> {
  return {
    baseStatus: state.baseStatus,
    enhancedStatus: state.enhancedStatus,
    socialPlatform: state.socialPlatform,
    parkingSocialPlatform: state.parkingSocialPlatform,
    propertyRelationship: state.propertyRelationship,
    propertyContractEndDate: state.propertyContractEndDate,
    parkingRelationship: state.parkingRelationship,
    parkingContractEndDate: state.parkingContractEndDate,
    baseSubmittedAt: state.baseSubmittedAt,
    enhancedSubmittedAt: state.enhancedSubmittedAt,
    baseRejectionReason: state.baseRejectionReason,
    enhancedRejectionReason: state.enhancedRejectionReason,
    baseRejectionKind: state.baseRejectionKind,
    enhancedRejectionKind: state.enhancedRejectionKind,
    baseChangesRequestedDocs: state.baseChangesRequestedDocs,
    assets: {
      validIdPath: state.assets.validIdPath,
      socialProofPath: state.assets.socialProofPath,
      propertyOwnershipProofPath: state.assets.propertyOwnershipProofPath,
      parkingSocialProofPath: state.assets.parkingSocialProofPath,
      selfieWithIdPath: state.assets.selfieWithIdPath,
      ownershipProofPath: state.assets.ownershipProofPath,
      pmoEmailPaths: state.assets.pmoEmailPaths,
    },
    propertyLifecycle: contractLegLifecycleToSettingsValue(state.propertyLifecycle),
    parkingLifecycle: contractLegLifecycleToSettingsValue(state.parkingLifecycle),
  };
}

export function isOrgVerifiedBadge(state: OrgVerificationState): boolean {
  return state.enhancedStatus === 'approved';
}

function rightsReady(
  rights: OrgVerificationRights | null,
  contractEndDate: string | null
): boolean {
  if (!rights) return false;
  if (verificationRightsNeedsContractEnd(rights) && !contractEndDate) return false;
  return true;
}

export function canSubmitBaseVerification(
  state: OrgVerificationState,
  hostModes: readonly string[] = ['property']
): boolean {
  if (!state.assets.validIdPath) return false;

  const modes = hostModes.length > 0 ? hostModes : ['property'];
  const needsProperty = modes.includes('property');
  const needsParking = modes.includes('parking');

  if (
    needsProperty &&
    (!state.assets.socialProofPath ||
      !state.assets.propertyOwnershipProofPath ||
      !state.socialPlatform ||
      !rightsReady(state.propertyRelationship, state.propertyContractEndDate))
  ) {
    return false;
  }
  if (
    needsParking &&
    (!state.assets.parkingSocialProofPath ||
      !rightsReady(state.parkingRelationship, state.parkingContractEndDate))
  ) {
    return false;
  }
  return true;
}

export function canSubmitEnhancedVerification(state: OrgVerificationState): boolean {
  return Boolean(
    state.assets.selfieWithIdPath &&
    state.assets.ownershipProofPath &&
    state.assets.pmoEmailPaths.length >= 1
  );
}

export function assetTypeToPathKey(
  assetType: OrgVerificationAssetType
): keyof OrgVerificationAssets | 'pmo_email' {
  switch (assetType) {
    case 'valid_id':
      return 'validIdPath';
    case 'social_proof':
      return 'socialProofPath';
    case 'property_ownership_proof':
      return 'propertyOwnershipProofPath';
    case 'parking_social_proof':
      return 'parkingSocialProofPath';
    case 'selfie_with_id':
      return 'selfieWithIdPath';
    case 'ownership_proof':
      return 'ownershipProofPath';
    case 'pmo_email_1':
    case 'pmo_email_2':
      return 'pmo_email';
  }
}

export function applyAssetPath(
  state: OrgVerificationState,
  assetType: OrgVerificationAssetType,
  path: string
): OrgVerificationState {
  const next: OrgVerificationState = {
    ...state,
    assets: {
      ...state.assets,
      pmoEmailPaths: [...state.assets.pmoEmailPaths],
    },
  };
  const key = assetTypeToPathKey(assetType);
  if (key === 'pmo_email') {
    const slot0 = next.assets.pmoEmailPaths[0] ?? '';
    const slot1 = next.assets.pmoEmailPaths[1] ?? '';
    if (assetType === 'pmo_email_1') {
      next.assets.pmoEmailPaths = slot1 ? [path, slot1] : [path];
    } else {
      next.assets.pmoEmailPaths = slot0 ? [path, slot1] : [path];
    }
    return next;
  }
  next.assets[key] = path;
  return next;
}
