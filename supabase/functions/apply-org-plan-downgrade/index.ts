/**
 * apply-org-plan-downgrade — Org owner confirms a self-serve downgrade (paid→lower paid or
 * paid→Free) without PayMongo. Upgrades and same-plan billing updates stay on
 * create-org-subscription-checkout. See _shared/planEntitlements.ts#applyOrgPlanDowngrade.
 */

import { verifyOrgOwner } from '../_shared/orgAuth.ts';
import { applyOrgPlanDowngrade } from '../_shared/planEntitlements.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('apply-org-plan-downgrade', async (req, user) => {
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
    const result = await applyOrgPlanDowngrade(organizationId, planId, user.id);
    return jsonSuccess(req, result);
  } catch (err) {
    const message = (err as Error).message;
    const clientError =
      message.includes('No active subscription') ||
      message.includes('Use checkout') ||
      message.includes('Already on the Free') ||
      message.includes('Plan not found') ||
      message.includes('Only subscription') ||
      message.includes('no enrolled properties');
    return jsonError(req, message, clientError ? 400 : 502);
  }
});
