/**
 * submit-listing-authorization — Owner submits a listing's Tier 1 (authority) for review.
 * Independent of org verification: a listing may be submitted while the host tier is still pending.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { resetLifecycleForNewContractCycle } from '../_shared/contractLifecycle.ts';
import {
  canSubmitBaseListingAuthorization,
  isListingAuthorizationHardRejected,
  listingRightsNeedContractEnd,
  type ListingAuthorizationState,
} from '../_shared/listingAuthorization.ts';
import {
  parseListingKind,
  saveListingAuthorization,
  serializeListingAuthorization,
  verifyListingOwner,
} from '../_shared/listingAuthorizationService.ts';
import {
  ORG_VERIFICATION_RIGHTS,
  validateVerificationContractEndDate,
  type OrgVerificationRights,
} from '../_shared/orgVerification.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('submit-listing-authorization', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const listingKind = parseListingKind(body.listingKind);
  const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : '';
  const relationshipRaw = typeof body.relationship === 'string' ? body.relationship.trim() : '';

  if (!listingKind) return jsonError(req, 'listingKind must be property or parking');
  if (!listingId) return jsonError(req, 'listingId is required');
  if (!(ORG_VERIFICATION_RIGHTS as readonly string[]).includes(relationshipRaw)) {
    return jsonError(
      req,
      'relationship must be property_owner, authorized_representative, sublessee, or property_admin'
    );
  }
  const relationship = relationshipRaw as OrgVerificationRights;

  const context = await verifyListingOwner(req, listingKind, listingId);
  let state: ListingAuthorizationState = { ...context.authorization, relationship };

  if (state.baseStatus === 'approved') {
    return jsonError(req, 'This listing is already approved');
  }
  if (isListingAuthorizationHardRejected(context.authorization)) {
    return jsonError(req, 'This listing was declined. Please start a new application.');
  }

  if (listingRightsNeedContractEnd(state)) {
    const endRaw = typeof body.contractEndDate === 'string' ? body.contractEndDate.trim() : '';
    const endError = validateVerificationContractEndDate(endRaw);
    if (endError) return jsonError(req, endError);

    const previousEnd = state.contractEndDate;
    state = {
      ...state,
      contractEndDate: endRaw,
      ...(previousEnd && previousEnd !== endRaw
        ? { lifecycle: resetLifecycleForNewContractCycle(state.lifecycle) }
        : {}),
    };
  } else {
    state = { ...state, contractEndDate: null };
  }

  if (!canSubmitBaseListingAuthorization(state)) {
    const missing: string[] = [];
    if (!state.assets.proofPath) missing.push('proof of ownership or authorization');
    if (listingRightsNeedContractEnd(state) && !state.contractEndDate) {
      missing.push('contract end date');
    }
    return jsonError(req, `Required: ${missing.join(', ')}`);
  }

  state = {
    ...state,
    baseStatus: 'pending',
    baseSubmittedAt: new Date().toISOString(),
    baseRejectionReason: null,
    baseRejectionKind: null,
  };

  const supabase = createServiceClient();
  const listing = await saveListingAuthorization(supabase, context, state);

  return jsonSuccess(req, serializeListingAuthorization(context, state, listing));
});
