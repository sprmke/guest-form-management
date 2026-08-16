/**
 * list-hosts — GET platform org owners (super admin).
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { listDistinctHostOwnerIds, loadHostSummary } from '../_shared/hostSerialize.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

serveAuthenticated('list-hosts', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const supabase = createServiceClient();
  const ownerIds = await listDistinctHostOwnerIds(supabase);

  const hosts = await Promise.all(ownerIds.map((ownerId) => loadHostSummary(supabase, ownerId)));

  hosts.sort((a, b) => a.name.localeCompare(b.name));

  return jsonSuccess(req, { hosts });
});
