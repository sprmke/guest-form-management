/**
 * create-org-subscription-checkout — Org owner creates a PayMongo Payment Link for a
 * portfolio bundle plan (Pro/Business/Business Plus), covering the selected properties.
 * Parallel to create-subscription-checkout (per-property). See _shared/orgSubscriptionCheckout.ts.
 */

import { verifyOrgOwner } from '../_shared/orgAuth.ts';
import { createOrgSubscriptionCheckoutLink } from '../_shared/orgSubscriptionCheckout.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('create-org-subscription-checkout', async (req, user) => {
  requireHttpMethod(req, 'POST');

  const body = await readJsonBody(req);
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId.trim() : '';
  const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
  const propertyIds = Array.isArray(body.propertyIds)
    ? body.propertyIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim())
    : [];

  if (!organizationId) {
    return jsonError(req, 'organizationId is required');
  }
  if (!planId) {
    return jsonError(req, 'planId is required');
  }
  if (propertyIds.length === 0) {
    return jsonError(req, 'propertyIds must include at least one property');
  }

  await verifyOrgOwner(req, organizationId);

  try {
    const result = await createOrgSubscriptionCheckoutLink({
      organizationId,
      planId,
      propertyIds,
      initiatedBy: user.id,
    });
    return jsonSuccess(req, result);
  } catch (err) {
    return jsonError(
      req,
      (err as Error).message,
      err instanceof Error && err.message.includes('not configured') ? 503 : 502
    );
  }
});
