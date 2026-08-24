/**
 * list-hosts — GET platform org owners (super admin), searched + paginated server-side.
 * Query: q (search name/email), page, limit
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { loadHostsPlatformSummary, searchHostsPage } from '../_shared/hostSerialize.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

serveAuthenticated('list-hosts', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const url = new URL(req.url);
  const p = url.searchParams;
  const page = Math.max(1, parseInt(p.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '31', 10)));
  const q = (p.get('q') ?? '').trim();

  const supabase = createServiceClient();

  const [{ hosts, total }, summary] = await Promise.all([
    searchHostsPage(supabase, { search: q, page, limit }),
    loadHostsPlatformSummary(supabase),
  ]);

  return jsonSuccess(req, { hosts, total, page, limit, summary });
});
