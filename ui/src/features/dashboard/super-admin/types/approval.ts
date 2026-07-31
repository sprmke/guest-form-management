import type {
  OrgVerificationRights,
  OrgVerificationStatus,
  OrgSocialProofPlatform,
} from '@/features/dashboard/org/lib/orgVerification';
import type { OrgVerificationRejectionKind } from '@/features/dashboard/org/lib/orgVerificationTiers';

export type OrgApprovalSummary = {
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
  createdAt: string;
};

export type OrgVerificationAssetUrls = {
  validIdUrl: string | null;
  socialProofUrl: string | null;
  propertyOwnershipProofUrl: string | null;
  parkingSocialProofUrl: string | null;
  selfieWithIdUrl: string | null;
  ownershipProofUrl: string | null;
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
