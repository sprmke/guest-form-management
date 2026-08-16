/**
 * delete-parking — DELETE a parking slot (org:parkings:manage).
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { resolveScopedParkingAccess } from '../_shared/parkingScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('delete-parking', async (req) => {
  requireHttpMethod(req, 'DELETE');
  const body = await readJsonBody(req);

  const parkingId = typeof body.parkingId === 'string' ? body.parkingId.trim() : '';
  if (!parkingId) {
    return jsonError(req, 'parkingId is required');
  }

  const url = new URL(req.url);
  url.searchParams.set('parking_id', parkingId);
  const scopedReq = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
  });

  const { parkingRow } = await resolveScopedParkingAccess(scopedReq, 'org:parkings:manage');
  const supabase = createServiceClient();

  const { error: deleteError } = await supabase.from('parkings').delete().eq('id', parkingRow.id);

  if (deleteError) {
    console.error('[delete-parking]', deleteError.message);
    return jsonError(req, 'Failed to delete parking', 500);
  }

  return jsonSuccess(req, { deletedParkingId: parkingRow.id });
});
