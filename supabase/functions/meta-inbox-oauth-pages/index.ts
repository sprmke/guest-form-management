/**
 * List Facebook Pages pending selection after Meta OAuth.
 */

import type { MetaPagePickerOption } from '../_shared/metaInboxConnect.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('meta-inbox-oauth-pages', async (req, user) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const ctx = await resolveOrgAccessContext(req, 'org:inbox:manage');
  const picker = new URL(req.url).searchParams.get('picker')?.trim();
  if (!picker) {
    return jsonError(req, 'picker query param required', 400);
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('meta_inbox_oauth_state')
    .select('organization_id, user_id, expires_at, pending_pages, encrypted_user_token')
    .eq('state', picker)
    .maybeSingle();

  if (error || !data) {
    return jsonError(req, 'Picker session not found', 404);
  }

  const exp = new Date(data.expires_at as string).getTime();
  if (
    data.organization_id !== ctx.org.id ||
    data.user_id !== user.id ||
    Number.isNaN(exp) ||
    Date.now() > exp ||
    !data.pending_pages ||
    !data.encrypted_user_token
  ) {
    return jsonError(req, 'Picker session expired', 404);
  }

  return jsonSuccess(req, {
    pages: data.pending_pages as MetaPagePickerOption[],
  });
});
