/**
 * list-host-organizations — GET orgs owned by a host (super admin).
 */

import { createServiceClient, serializeOrganization, type OrgRow } from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

serveAuthenticated('list-host-organizations', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const url = new URL(req.url);
  const hostId = url.searchParams.get('hostId')?.trim() ?? '';
  if (!hostId) {
    return jsonError(req, 'hostId is required');
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', hostId)
    .order('name', { ascending: true });

  if (error) {
    console.error('[list-host-organizations]', error.message);
    throw new Error('Failed to list host organizations');
  }

  const orgs = (data ?? []) as OrgRow[];
  const organizations = await Promise.all(
    orgs.map(async (org) => {
      const [{ count: propertyCount }, { count: parkingCount }] = await Promise.all([
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id),
        supabase
          .from('parkings')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id),
      ]);

      return {
        ...serializeOrganization(org),
        accessKind: 'owner' as const,
        stats: {
          propertyCount: propertyCount ?? 0,
          parkingCount: parkingCount ?? 0,
        },
      };
    })
  );

  return jsonSuccess(req, { organizations });
});
