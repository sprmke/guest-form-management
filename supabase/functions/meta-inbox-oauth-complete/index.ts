/**
 * Complete Meta OAuth by connecting the selected Facebook Page.
 */

import { decryptMetaInboxToken } from '../_shared/metaInboxCrypto.ts';
import {
  connectOrgMetaInboxPage,
  resolveMetaPageFromUserToken,
  type MetaPagePickerOption,
} from '../_shared/metaInboxConnect.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('meta-inbox-oauth-complete', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const ctx = await resolveOrgAccessContext(req, 'org:inbox:manage');
  const body = await readJsonBody(req);
  const pickerState = String(body.pickerState ?? '').trim();
  const pageId = String(body.pageId ?? '').trim();
  if (!pickerState || !pageId) {
    return jsonError(req, 'pickerState and pageId required', 400);
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('meta_inbox_oauth_state')
    .select('organization_id, user_id, expires_at, pending_pages, encrypted_user_token')
    .eq('state', pickerState)
    .maybeSingle();

  if (error || !data) {
    return jsonError(req, 'Picker session not found', 404);
  }

  const exp = new Date(data.expires_at as string).getTime();
  const pending = (data.pending_pages ?? []) as MetaPagePickerOption[];
  if (
    data.organization_id !== ctx.org.id ||
    data.user_id !== user.id ||
    Number.isNaN(exp) ||
    Date.now() > exp ||
    !pending.length ||
    !data.encrypted_user_token ||
    !pending.some((p) => p.id === pageId)
  ) {
    return jsonError(req, 'Picker session expired', 404);
  }

  try {
    const userToken = await decryptMetaInboxToken(data.encrypted_user_token as string);
    const page = await resolveMetaPageFromUserToken(userToken, pageId);
    if (!page) {
      return jsonError(req, 'Page not available', 400);
    }

    await connectOrgMetaInboxPage(ctx.org.id, page);
    await sb.from('meta_inbox_oauth_state').delete().eq('state', pickerState);

    return jsonSuccess(req, { connected: true, pageName: page.name });
  } catch (e) {
    console.error('[meta-inbox-oauth-complete]', e);
    return jsonError(req, (e as Error).message, 500);
  }
});
