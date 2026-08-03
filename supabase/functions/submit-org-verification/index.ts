/**
 * submit-org-verification — Owner submits base or enhanced verification for review.
 * Auth: verifyOrgOwner via orgId in body.
 */

import { verifyOrgOwner, createServiceClient, serializeOrganization } from '../_shared/orgAuth.ts';
import {
  canSubmitBaseVerification,
  canSubmitEnhancedVerification,
  ORG_SOCIAL_PROOF_PLATFORMS,
  ORG_VERIFICATION_RIGHTS,
  orgVerificationToSettingsValue,
  readOrgVerificationFromSettings,
  validateVerificationContractEndDate,
  verificationRightsNeedsContractEnd,
  type OrgSocialProofPlatform,
  type OrgVerificationRights,
} from '../_shared/orgVerification.ts';
import { resetLifecycleForNewContractCycle } from '../_shared/contractLifecycle.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('submit-org-verification', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  const tier = body.tier === 'enhanced' ? 'enhanced' : body.tier === 'base' ? 'base' : '';
  if (!orgId) return jsonError(req, 'orgId is required');
  if (!tier) return jsonError(req, 'tier must be base or enhanced');

  const { org } = await verifyOrgOwner(req, orgId);
  const supabase = createServiceClient();

  const currentSettings =
    org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
      ? (org.settings as Record<string, unknown>)
      : {};
  let verification = readOrgVerificationFromSettings(currentSettings);

  if (tier === 'base') {
    const hostModes = Array.isArray(org.host_modes) ? (org.host_modes as string[]) : ['property'];
    const needsProperty = hostModes.includes('property');
    const needsParking = hostModes.includes('parking');

    const platformRaw = typeof body.socialPlatform === 'string' ? body.socialPlatform.trim() : '';
    const propertyRelationshipRaw =
      typeof body.propertyRelationship === 'string' ? body.propertyRelationship.trim() : '';
    const parkingRelationshipRaw =
      typeof body.parkingRelationship === 'string' ? body.parkingRelationship.trim() : '';

    if (needsProperty) {
      if (!ORG_SOCIAL_PROOF_PLATFORMS.includes(platformRaw as OrgSocialProofPlatform)) {
        return jsonError(req, 'socialPlatform must be facebook, instagram, or airbnb');
      }
      if (!ORG_VERIFICATION_RIGHTS.includes(propertyRelationshipRaw as OrgVerificationRights)) {
        return jsonError(
          req,
          'propertyRelationship must be property_owner, authorized_representative, sublessee, or property_admin'
        );
      }
      const propertyRelationship = propertyRelationshipRaw as OrgVerificationRights;
      verification = {
        ...verification,
        socialPlatform: platformRaw as OrgSocialProofPlatform,
        propertyRelationship,
      };

      if (verificationRightsNeedsContractEnd(propertyRelationship)) {
        const endRaw =
          typeof body.propertyContractEndDate === 'string'
            ? body.propertyContractEndDate.trim()
            : '';
        const endError = validateVerificationContractEndDate(endRaw);
        if (endError) return jsonError(req, endError);
        const prevEnd = verification.propertyContractEndDate;
        verification = {
          ...verification,
          propertyContractEndDate: endRaw,
          ...(prevEnd && prevEnd !== endRaw
            ? {
                propertyLifecycle: resetLifecycleForNewContractCycle(
                  verification.propertyLifecycle
                ),
              }
            : {}),
        };
      } else {
        verification = { ...verification, propertyContractEndDate: null };
      }
    }

    if (needsParking) {
      if (!ORG_VERIFICATION_RIGHTS.includes(parkingRelationshipRaw as OrgVerificationRights)) {
        return jsonError(
          req,
          'parkingRelationship must be property_owner, authorized_representative, sublessee, or property_admin'
        );
      }
      const parkingRelationship = parkingRelationshipRaw as OrgVerificationRights;
      verification = {
        ...verification,
        parkingRelationship,
      };

      if (verificationRightsNeedsContractEnd(parkingRelationship)) {
        const endRaw =
          typeof body.parkingContractEndDate === 'string' ? body.parkingContractEndDate.trim() : '';
        const endError = validateVerificationContractEndDate(endRaw);
        if (endError) return jsonError(req, endError);
        const prevEnd = verification.parkingContractEndDate;
        verification = {
          ...verification,
          parkingContractEndDate: endRaw,
          ...(prevEnd && prevEnd !== endRaw
            ? { parkingLifecycle: resetLifecycleForNewContractCycle(verification.parkingLifecycle) }
            : {}),
        };
      } else {
        verification = { ...verification, parkingContractEndDate: null };
      }
    }

    if (!canSubmitBaseVerification(verification, hostModes)) {
      const missing: string[] = [];
      if (!verification.assets.validIdPath) missing.push('valid ID');
      if (needsProperty && !verification.assets.socialProofPath) {
        missing.push('property access screenshot');
      }
      if (needsProperty && !verification.assets.propertyOwnershipProofPath) {
        missing.push('property ownership or management proof');
      }
      if (needsProperty && !verification.propertyRelationship) {
        missing.push('property/parking rights');
      }
      if (
        needsProperty &&
        verificationRightsNeedsContractEnd(verification.propertyRelationship) &&
        !verification.propertyContractEndDate
      ) {
        missing.push('property contract end date');
      }
      if (needsParking && !verification.assets.parkingSocialProofPath) {
        missing.push('parking ownership or management proof');
      }
      if (needsParking && !verification.parkingRelationship) {
        missing.push('parking property/parking rights');
      }
      if (
        needsParking &&
        verificationRightsNeedsContractEnd(verification.parkingRelationship) &&
        !verification.parkingContractEndDate
      ) {
        missing.push('parking contract end date');
      }
      return jsonError(req, `Required: ${missing.join(', ')}`);
    }
    if (verification.baseStatus === 'approved') {
      return jsonError(req, 'Base verification is already approved');
    }
    if (verification.baseStatus === 'rejected' && verification.baseRejectionKind === 'rejected') {
      return jsonError(req, 'This verification was declined. Please start a new application.');
    }
    verification = {
      ...verification,
      baseStatus: 'pending',
      baseSubmittedAt: new Date().toISOString(),
      baseRejectionReason: null,
      baseRejectionKind: null,
      baseChangesRequestedDocs: [],
    };
  } else {
    if (!canSubmitEnhancedVerification(verification)) {
      return jsonError(
        req,
        'Selfie with ID, ownership proof, and at least one PMO email screenshot are required'
      );
    }
    if (verification.enhancedStatus === 'approved') {
      return jsonError(req, 'Enhanced verification is already approved');
    }
    verification = {
      ...verification,
      enhancedStatus: 'pending',
      enhancedSubmittedAt: new Date().toISOString(),
      enhancedRejectionReason: null,
      enhancedRejectionKind: null,
    };
  }

  const { data, error } = await supabase
    .from('organizations')
    .update({
      settings: {
        ...currentSettings,
        verification: orgVerificationToSettingsValue(verification),
      },
    })
    .eq('id', orgId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[submit-org-verification]', error?.message);
    return jsonError(req, 'Failed to submit verification', 500);
  }

  return jsonSuccess(req, {
    organization: serializeOrganization(data),
    verification: {
      baseStatus: verification.baseStatus,
      enhancedStatus: verification.enhancedStatus,
      socialPlatform: verification.socialPlatform,
      propertyRelationship: verification.propertyRelationship,
      propertyContractEndDate: verification.propertyContractEndDate,
      parkingRelationship: verification.parkingRelationship,
      parkingContractEndDate: verification.parkingContractEndDate,
      verifiedBadge: verification.enhancedStatus === 'approved',
    },
  });
});
