import type {
  OrgVerificationRights,
  OrgVerificationStatus,
  OrgSocialProofPlatform,
} from '@/features/dashboard/org/lib/orgVerification';
import type { OrgVerificationRejectionKind } from '@/features/dashboard/org/lib/orgVerificationTiers';
import type { ConsiderationStatus } from '@/features/dashboard/org/lib/contractLifecycle';
import type {
  ExternalReviewModerationStatus,
  ExternalReviewSource,
} from '@/features/dashboard/org/lib/propertyExternalReviews';

/** ACTIVE peer listing at the same tower+unit (other org) — from list-org-verifications. */
export type OrgApprovalUnitConflict = {
  propertyId: string;
  organizationId: string;
  orgName: string;
  status: string;
  tower: string;
  unitNumber: string;
};

export type OrgApprovalSummary = {
  type: 'org_verification';
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  hostModes: string[];
  ownerName: string;
  ownerEmail: string;
  baseStatus: OrgVerificationStatus;
  baseSubmittedAt: string | null;
  baseRejectionReason: string | null;
  baseRejectionKind: OrgVerificationRejectionKind | null;
  enhancedStatus: OrgVerificationStatus;
  enhancedSubmittedAt: string | null;
  createdAt: string;
  unitConflicts: OrgApprovalUnitConflict[];
  hasActiveUnitConflict: boolean;
  propertyConsiderationStatus: ConsiderationStatus;
  parkingConsiderationStatus: ConsiderationStatus;
  hasPendingConsideration: boolean;
  propertyAccessLocked: boolean;
  parkingAccessLocked: boolean;
};

export type ExternalReviewApprovalSummary = {
  type: 'external_review';
  propertyId: string;
  propertyName: string;
  propertySlug: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  reviewId: string;
  source: ExternalReviewSource;
  reviewText: string;
  reviewerName: string;
  starRating: number | null;
  moderationStatus: ExternalReviewModerationStatus;
  submittedAt: string | null;
  imageUrl: string | null;
  proofUrl: string | null;
  stayPhotoUrls: string[];
  imagePath: string | null;
};

export type ApprovalQueueItem = OrgApprovalSummary | ExternalReviewApprovalSummary;

export type SuperAdminApprovalTypeFilter = 'all' | 'property' | 'parking' | 'reviews';

export type OrgVerificationAssetUrls = {
  validIdUrl: string | null;
  socialProofUrl: string | null;
  propertyOwnershipProofUrl: string | null;
  parkingSocialProofUrl: string | null;
  selfieWithIdUrl: string | null;
  ownershipProofUrl: string | null;
  azurePmoConfirmationUrl: string | null;
  /** @deprecated use azurePmoConfirmationUrl */
  opsProofUrl?: string | null;
  pmoEmailUrls: (string | null)[];
};

export type OrgApprovalVerification = {
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
};

export type OrgApprovalDetail = {
  organization: { id: string; name: string; slug: string; hostModes?: string[] };
  verification: OrgApprovalVerification;
  assetUrls: OrgVerificationAssetUrls;
};
