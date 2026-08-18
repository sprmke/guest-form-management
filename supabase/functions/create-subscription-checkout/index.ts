/**
 * create-subscription-checkout — Property owner creates a PayMongo Payment Link for a paid tier.
 */

import { verifyPropertyOwner } from '../_shared/orgAuth.ts';
import { getActivePropertySubscription } from '../_shared/planEntitlements.ts';
import { createPropertySubscriptionCheckoutLink } from '../_shared/propertySubscriptionCheckout.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { readPropertyIdFromUrl } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('create-subscription-checkout', async (req, user) => {
  requireHttpMethod(req, 'POST');

  const url = new URL(req.url);
  const body = await readJsonBody(req);
  const propertyId =
    (typeof body.propertyId === 'string' ? body.propertyId.trim() : '') ||
    (typeof body.property_id === 'string' ? body.property_id.trim() : '') ||
    readPropertyIdFromUrl(url);
  let planId = typeof body.planId === 'string' ? body.planId.trim() : '';
  const renewCurrent = body.renewCurrent === true || body.mode === 'renewal';

  if (!propertyId) {
    return jsonError(req, 'propertyId is required');
  }

  await verifyPropertyOwner(req, propertyId);

  if (!planId || renewCurrent) {
    const subscription = await getActivePropertySubscription(propertyId);
    if (!subscription?.planId) {
      return jsonError(req, 'No active paid subscription to renew', 400);
    }
    planId = subscription.planId;
  }

  try {
    const result = await createPropertySubscriptionCheckoutLink({
      propertyId,
      planId,
      initiatedBy: user.id,
      purpose: renewCurrent ? 'renewal' : 'initial',
      forceNew: renewCurrent,
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
