/**
 * Disconnect Meta inbox channels for org default or property/parking override.
 */

import { resolveInboxAccess } from '../_shared/inboxAccess.ts';
import {
  clearOrgMetaInbox,
  clearParkingMetaInbox,
  clearPropertyMetaInbox,
} from '../_shared/metaInboxLifecycle.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('meta-inbox-disconnect', async (req) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }
  const body = (await readJsonBody(req)) as Record<string, unknown>;
  const ctx = await resolveInboxAccess(req, 'manage', body);
  const platform = typeof body.platform === 'string' ? body.platform : 'meta';

  if (platform !== 'meta' && platform !== 'facebook' && platform !== 'instagram') {
    return jsonError(req, 'Invalid platform', 400);
  }

  if (platform !== 'meta') {
    return jsonError(req, 'Disconnect Meta as a whole from Channels', 400);
  }

  let conversationsCleared = 0;
  let connectionsRemoved = 0;

  if (ctx.kind === 'property' && ctx.propertyId) {
    ({ conversationsCleared, connectionsRemoved } = await clearPropertyMetaInbox(
      ctx.orgId,
      ctx.propertyId
    ));
  } else if (ctx.kind === 'parking' && ctx.parkingId) {
    ({ conversationsCleared, connectionsRemoved } = await clearParkingMetaInbox(
      ctx.orgId,
      ctx.parkingId
    ));
  } else {
    ({ conversationsCleared, connectionsRemoved } = await clearOrgMetaInbox(ctx.orgId));
  }

  return jsonSuccess(req, {
    disconnected: connectionsRemoved,
    conversationsCleared,
  });
});
