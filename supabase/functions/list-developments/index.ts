/**
 * list-developments — GET all platform developments (super admin).
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  developmentStatsByName,
  serializeDevelopment,
  type DevelopmentRow,
} from '../_shared/developmentSerialize.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

serveAuthenticated('list-developments', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('developments')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[list-developments]', error.message);
    throw new Error('Failed to list developments');
  }

  const rows = (data ?? []) as DevelopmentRow[];
  const statsMap = await developmentStatsByName(
    supabase,
    rows.map((row) => row.name)
  );

  return jsonSuccess(req, {
    developments: rows.map((row) =>
      serializeDevelopment(row, statsMap.get(row.name) ?? { propertyCount: 0, parkingCount: 0 })
    ),
  });
});
