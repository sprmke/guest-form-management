/**
 * property-pricing — GET/PATCH property nightly rates, fee defaults, calendar overrides.
 * Auth: verifyAdminJwt + property team pricing:view | pricing:edit
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import {
  loadPropertyPricing,
  savePropertyPricing,
  type PropertyPricingPatch,
} from '../_shared/propertyPricing.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('property-pricing', async (req) => {
  const permission = req.method === 'GET' ? 'pricing:view' : 'pricing:edit';
  const { property } = await resolveScopedPropertyAccess(req, permission);
  const propertyId = property.id;
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

    const data = await loadPropertyPricing(propertyId, { monthStart, monthEnd });
    return jsonSuccess(req, data);
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const patch: PropertyPricingPatch = {};

    if (body.weekdayNightlyRate !== undefined) {
      patch.weekdayNightlyRate = body.weekdayNightlyRate;
    }
    if (body.weekendNightlyRate !== undefined) {
      patch.weekendNightlyRate = body.weekendNightlyRate;
    }
    if (body.downPayment !== undefined) patch.downPayment = body.downPayment;
    if (body.securityDeposit !== undefined) {
      patch.securityDeposit = body.securityDeposit;
    }
    if (body.petFee !== undefined) patch.petFee = body.petFee;
    if (body.parkingRateGuest !== undefined) {
      patch.parkingRateGuest = body.parkingRateGuest;
    }
    if (body.guestAdditionalFee !== undefined) {
      patch.guestAdditionalFee = body.guestAdditionalFee;
    }

    if (body.holidayRules !== undefined) {
      patch.holidayRules = body.holidayRules;
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
      const data = await savePropertyPricing(propertyId, patch);
      return jsonSuccess(req, data);
    } catch (e) {
      return jsonError(req, (e as Error).message, 400);
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
