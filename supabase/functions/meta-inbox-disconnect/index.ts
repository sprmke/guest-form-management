/**
 * Disconnect Meta inbox channels for an org.
 */

import { clearOrgMetaInbox } from '../_shared/metaInboxLifecycle.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('meta-inbox-disconnect', async (req) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }
  const ctx = await resolveOrgAccessContext(req, 'org:inbox:manage');
  const body = await readJsonBody(req);
  const platform = typeof body.platform === 'string' ? body.platform : 'meta';

  if (platform !== 'meta' && platform !== 'facebook' && platform !== 'instagram') {
    return jsonError(req, 'Invalid platform', 400);
  }

  if (platform !== 'meta') {
    return jsonError(req, 'Disconnect Meta as a whole from Channels', 400);
  }

  const { conversationsCleared, connectionsRemoved } = await clearOrgMetaInbox(ctx.org.id);

  return jsonSuccess(req, {
    disconnected: connectionsRemoved,
    conversationsCleared,
  });
});
