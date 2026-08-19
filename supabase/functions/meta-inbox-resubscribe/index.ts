/**
 * meta-inbox-resubscribe — re-checks the effective Meta page webhook and repairs it if needed.
 */

import { resolveInboxAccess } from '../_shared/inboxAccess.ts';
import { reconcileMetaConnectionWebhook } from '../_shared/metaInboxWebhookHealth.ts';
import { resolveEffectiveMetaConnection } from '../_shared/metaInboxScope.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('meta-inbox-resubscribe', async (req) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const body = (await readJsonBody(req)) as Record<string, unknown>;
  const ctx = await resolveInboxAccess(req, 'manage', body);
  const effective = await resolveEffectiveMetaConnection(ctx.orgId, ctx.scope);
  const facebook = effective.connections.find((connection) => connection.platform === 'facebook');

  if (!facebook) {
    return jsonError(req, 'No connected Meta page found for this inbox', 404);
  }

  const result = await reconcileMetaConnectionWebhook(facebook);
  return jsonSuccess(req, result);
});
