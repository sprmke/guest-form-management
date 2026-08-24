/**
 * dashboard-stats — Admin home dashboard aggregates.
 * Property scope: ?property_id=…
 * Parking scope: ?parking_id=…
 * Org scope: ?org_slug=… or ?org_id=… (aggregates org properties + parking listings)
 */

import { computeDashboardStats } from '../_shared/dashboardService.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import {
  readOrgIdFromUrl,
  readOrgSlugFromUrl,
  readPropertyIdFromUrl,
  resolveOrgAccessContext,
  resolveScopedPropertyAccess,
} from '../_shared/propertyScope.ts';
import { readParkingIdFromUrl, resolveScopedParkingAccess } from '../_shared/parkingScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('dashboard-stats', async (req, user) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const url = new URL(req.url);
  const explicitPropertyId = readPropertyIdFromUrl(url);
  const explicitParkingId = readParkingIdFromUrl(url);
  const orgSlug = readOrgSlugFromUrl(url);
  const orgIdParam = readOrgIdFromUrl(url);

  let propertyId: string | undefined;
  let parkingId: string | undefined;
  let orgId: string | undefined;

  if (explicitParkingId) {
    await resolveScopedParkingAccess(req, 'bookings:view');
    parkingId = explicitParkingId;
  } else if (explicitPropertyId) {
    const { property } = await resolveScopedPropertyAccess(
      req,
      'bookings:view',
      explicitPropertyId
    );
    propertyId = property.id;
  } else if (orgSlug || orgIdParam) {
    const ctx = await resolveOrgAccessContext(req, 'org:dashboard:view');
    orgId = ctx.org.id;
  } else {
    const { property } = await resolveScopedPropertyAccess(req, 'bookings:view');
    propertyId = property.id;
  }

  const data = await computeDashboardStats({
    propertyId,
    parkingId,
    orgId,
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
  });

  return jsonSuccess(req, data);
});
