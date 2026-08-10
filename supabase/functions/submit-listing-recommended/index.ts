/**
 * submit-listing-recommended — Owner submits a listing's Tier 2 (Recommended) for review.
 * Requires this listing's Tier 1 to be approved; org tier status is irrelevant.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { canSubmitRecommendedListingAuthorization } from '../_shared/listingAuthorization.ts';
import {
  parseListingKind,
  saveListingAuthorization,
  serializeListingAuthorization,
  verifyListingOwner,
} from '../_shared/listingAuthorizationService.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('submit-listing-recommended', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const listingKind = parseListingKind(body.listingKind);
  const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : '';
  if (!listingKind) return jsonError(req, 'listingKind must be property or parking');
  if (!listingId) return jsonError(req, 'listingId is required');

  const context = await verifyListingOwner(req, listingKind, listingId);
  const current = context.authorization;

  if (current.baseStatus !== 'approved') {
    return jsonError(req, 'Approve this listing first before applying for Recommended');
  }
  if (current.recommendedStatus === 'approved') {
    return jsonError(req, 'This listing is already Recommended');
  }
  if (!canSubmitRecommendedListingAuthorization(current)) {
    return jsonError(
      req,
      'Additional proof of ownership or authorization and Azure PMO confirmation are required'
    );
  }

  const state = {
    ...current,
    recommendedStatus: 'pending' as const,
    recommendedSubmittedAt: new Date().toISOString(),
    recommendedRejectionReason: null,
    recommendedRejectionKind: null,
  };

  const supabase = createServiceClient();
  const listing = await saveListingAuthorization(supabase, context, state);

  return jsonSuccess(req, serializeListingAuthorization(context, state, listing));
});
