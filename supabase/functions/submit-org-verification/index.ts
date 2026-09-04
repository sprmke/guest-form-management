/**
 * submit-org-verification — Owner submits host Tier 1 (base) or Tier 2 (enhanced) for review.
 * Host scope only: identity and platform presence. Listing authority, rights, and contract end
 * dates go through submit-listing-authorization.
 * Auth: verifyOrgOwner via orgId in body.
 */

import { verifyOrgOwner, createServiceClient, serializeOrganization } from '../_shared/orgAuth.ts';
import {
  canSubmitBaseVerification,
  canSubmitEnhancedVerification,
  ORG_SOCIAL_PROOF_PLATFORMS,
  orgVerificationToSettingsValue,
  readOrgVerificationFromSettings,
  type OrgSocialProofPlatform,
} from '../_shared/orgVerification.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { catchPlanFeatureError, requireOrgPropertyFeature } from '../_shared/planEntitlements.ts';
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
    if (verification.baseStatus === 'approved') {
      return jsonError(req, 'Base verification is already approved');
    }
    if (verification.baseStatus === 'rejected' && verification.baseRejectionKind === 'rejected') {
      return jsonError(req, 'This verification was declined. Please start a new application.');
    }

    if (!canSubmitBaseVerification(verification)) {
      const missing: string[] = [];
      if (!verification.assets.validIdPath) missing.push('valid ID');
      if (!verification.assets.socialProofPath) missing.push('Facebook Page screenshot');
      return jsonError(req, `Required: ${missing.join(', ')}`);
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
    try {
      await requireOrgPropertyFeature(orgId, 'recommendedBadgeEligible');
    } catch (err) {
      const planErr = catchPlanFeatureError(req, err);
      if (planErr) return planErr;
      throw err;
    }

    if (verification.enhancedStatus === 'approved') {
      return jsonError(req, 'Enhanced verification is already approved');
    }

    const platformRaw =
      typeof body.platformAdminPlatform === 'string' ? body.platformAdminPlatform.trim() : '';
    if (platformRaw) {
      if (!ORG_SOCIAL_PROOF_PLATFORMS.includes(platformRaw as OrgSocialProofPlatform)) {
        return jsonError(req, 'platformAdminPlatform must be facebook, instagram, or airbnb');
      }
      verification = {
        ...verification,
        platformAdminPlatform: platformRaw as OrgSocialProofPlatform,
      };
    }

    if (!canSubmitEnhancedVerification(verification)) {
      return jsonError(req, 'Required: selfie with ID');
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
      platformAdminPlatform: verification.platformAdminPlatform,
      verifiedBadge: verification.enhancedStatus === 'approved',
    },
  });
});
