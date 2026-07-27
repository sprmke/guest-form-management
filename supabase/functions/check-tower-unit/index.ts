/**
 * check-tower-unit — GET whether a tower + unit pair is available globally.
 * Auth: verifyAuthenticatedUser.
 */

import {
  DUPLICATE_TOWER_UNIT_MESSAGE,
  isPropertyTower,
  isValidUnitNumber,
  lookupPropertyTowerUnitConflict,
} from '../_shared/propertyTowerUnit.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('check-tower-unit', async (req) => {
  requireHttpMethod(req, 'GET');

  const url = new URL(req.url);
  const tower = url.searchParams.get('tower')?.trim() ?? '';
  const unitNumber = url.searchParams.get('unitNumber')?.trim() ?? '';
  const excludePropertyId = url.searchParams.get('excludePropertyId')?.trim() || undefined;

  if (!isPropertyTower(tower) || !isValidUnitNumber(unitNumber)) {
    return jsonSuccess(req, { available: false, reason: 'invalid' });
  }

  const supabase = createServiceClient();
  const conflict = await lookupPropertyTowerUnitConflict(
    supabase,
    tower,
    unitNumber,
    excludePropertyId
  );

  return jsonSuccess(req, {
    available: !conflict,
    message: conflict ? DUPLICATE_TOWER_UNIT_MESSAGE : null,
    conflict: conflict
      ? {
          propertyId: conflict.id,
          propertyName: conflict.name,
          orgName: conflict.orgName,
        }
      : null,
  });
});
