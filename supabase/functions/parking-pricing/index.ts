/**
 * parking-pricing — GET/PATCH parking nightly rates + calendar overrides.
 * Auth: verifyAdminJwt + org parking access (org:parkings:view | org:parkings:manage)
 */

import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import {
  loadParkingPricing,
  saveParkingPricing,
  type ParkingPricingPatch,
} from '../_shared/parkingPricing.ts';
import { resolveScopedParkingAccess } from '../_shared/parkingScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('parking-pricing', async (req) => {
  const permission = req.method === 'GET' ? 'org:parkings:view' : 'org:parkings:manage';
  const { parkingRow } = await resolveScopedParkingAccess(req, permission);
  const parkingId = parkingRow.id;
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const month = url.searchParams.get('month')?.trim();
    let monthStart: string | undefined;
    let monthEnd: string | undefined;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, mon] = month.split('-').map(Number);
      const end = new Date(year, mon, 0);
      monthStart = `${year}-${String(mon).padStart(2, '0')}-01`;
      monthEnd = `${year}-${String(mon).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    }

    const data = await loadParkingPricing(parkingId, { monthStart, monthEnd });
    return jsonSuccess(req, data);
  }

  if (req.method === 'PATCH') {
    requireHttpMethod(req, 'PATCH');
    const body = await readJsonBody(req);
    const patch: ParkingPricingPatch = {};

    if (body.weekdayNightlyRate !== undefined) {
      patch.weekdayNightlyRate = body.weekdayNightlyRate;
    }
    if (body.weekendNightlyRate !== undefined) {
      patch.weekendNightlyRate = body.weekendNightlyRate;
    }

    if (body.dateOverrides !== undefined) {
      if (
        typeof body.dateOverrides !== 'object' ||
        body.dateOverrides === null ||
        Array.isArray(body.dateOverrides)
      ) {
        return jsonError(req, 'dateOverrides must be an object', 400);
      }
      patch.dateOverrides = body.dateOverrides as Record<string, number>;
    }

    try {
      const data = await saveParkingPricing(parkingId, patch);
      return jsonSuccess(req, data);
    } catch (e) {
      return jsonError(req, (e as Error).message, 400);
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
