/**
 * finance-export — Admin CSV download for finance reports.
 * GET ?type=overview|stays|operating|transactions|combined&basis=&from=&to=...
 */

import { corsHeaders } from '../_shared/cors.ts';
import { buildFinanceExportCsv } from '../_shared/financeExport.ts';
import { financeDbScope, resolveFinanceAssetAccess } from '../_shared/financeAssetScope.ts';
import { parseFinanceExportType, parseFinanceListQueryParams } from '../_shared/financeHttp.ts';
import { jsonError } from '../_shared/httpResponse.ts';
import { requirePropertyPermissionAndFeature } from '../_shared/orgAuth.ts';
import {
  catchPlanFeatureError,
  requirePropertyFeature,
  resolveListingEntitlementPropertyId,
} from '../_shared/planEntitlements.ts';
import { readParkingIdFromUrl } from '../_shared/parkingScope.ts';
import { readPropertyIdFromUrl } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('finance-export', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const url = new URL(req.url);
  const parkingId = readParkingIdFromUrl(url);
  const propertyId = readPropertyIdFromUrl(url);

  let asset: { kind: 'property'; id: string } | { kind: 'parking'; id: string };

  if (parkingId) {
    // Parking team stays on coarse finance:view until Phase 9.
    asset = await resolveFinanceAssetAccess(req, 'finance:view');
    try {
      const entitlementPropertyId = await resolveListingEntitlementPropertyId(asset.kind, asset.id);
      await requirePropertyFeature(entitlementPropertyId, 'financeReporting');
    } catch (err) {
      const planErr = catchPlanFeatureError(req, err);
      if (planErr) return planErr;
      throw err;
    }
  } else {
    if (!propertyId) {
      return jsonError(req, 'property_id or parking_id is required', 400);
    }
    try {
      await requirePropertyPermissionAndFeature(
        req,
        propertyId,
        'finance.export:view',
        'financeReporting'
      );
    } catch (err) {
      if (err instanceof Response) return err;
      throw err;
    }
    asset = { kind: 'property', id: propertyId };
  }

  const scope = financeDbScope(asset);
  const p = url.searchParams;
  const query = parseFinanceListQueryParams(url);
  const { filename, body } = await buildFinanceExportCsv({
    ...scope,
    type: parseFinanceExportType(p.get('type')),
    from: query.from,
    to: query.to,
    basis: query.basis,
    includeCancelled: query.includeCancelled,
    completedOnly: query.completedOnly,
    q: query.q,
  });

  return new Response(body, {
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
