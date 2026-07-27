/**
 * Start Meta OAuth for org social inbox (Facebook Login for Business).
 */

import { buildMetaOAuthUrl } from '../_shared/metaInboxGraph.ts';
import { isMetaReturnOriginAllowed, sanitizeMetaReturnPath } from '../_shared/metaInboxConfig.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

serveAuthenticated('meta-inbox-oauth-start', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const ctx = await resolveOrgAccessContext(req, 'org:inbox:manage');
  let returnPath = '/inbox';
  try {
    const body = await readJsonBody(req);
    if (body && typeof body.returnPath === 'string') {
      returnPath = sanitizeMetaReturnPath(body.returnPath);
    }
  } catch {
    /* default */
  }

  const originHeader = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
  let returnOrigin = '';
  if (originHeader.startsWith('http://') || originHeader.startsWith('https://')) {
    try {
      const u = new URL(originHeader);
      returnOrigin = `${u.protocol}//${u.host}`;
    } catch {
      returnOrigin = '';
    }
  }
  if (!returnOrigin || !isMetaReturnOriginAllowed(returnOrigin)) {
    return jsonError(req, 'Invalid return origin', 400);
  }

  const state = randomState();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const sb = createServiceClient();
  const { error } = await sb.from('meta_inbox_oauth_state').insert({
    state,
    organization_id: ctx.org.id,
    user_id: user.id,
    expires_at: expiresAt,
    return_origin: returnOrigin,
    return_path: returnPath,
  });
  if (error) {
    console.error('[meta-inbox-oauth-start]', error);
    return jsonError(req, 'Failed to start OAuth', 500);
  }

  return jsonSuccess(req, { url: buildMetaOAuthUrl(state) });
});
