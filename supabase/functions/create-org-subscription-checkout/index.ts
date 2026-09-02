/**
 * create-org-subscription-checkout — Org owner creates a PayMongo Hosted Checkout Session
 * subscription at the chosen tier. Billing covers every property in the organization automatically.
 * This is the only subscription checkout in the system (billing is org-level only) — handles first
 * purchase, renewal, and mid-cycle changes (property count and/or tier) via the same function; see
 * _shared/orgSubscriptionCheckout.ts.
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

  if (!organizationId) {
    return jsonError(req, 'organizationId is required');
  }
  if (!planId) {
    return jsonError(req, 'planId is required');
  }

  await verifyOrgOwner(req, organizationId);

  try {
    const result = await createOrgSubscriptionCheckoutLink({
      organizationId,
      planId,
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
