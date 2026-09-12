/**
 * dashboard-stats — Admin home dashboard aggregates.
 * Property scope: ?property_id=…
 * Parking scope: ?parking_id=…
 * Org scope: ?org_slug=… or ?org_id=… (aggregates org properties + parking listings)
 * Scoped org admins (`all_listings = false`) only aggregate assigned listings.
 */

import { computeDashboardStats } from '../_shared/dashboardService.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveAssignedListingIdsForOrgUser } from '../_shared/orgAuth.ts';
import {
  readOrgIdFromUrl,
  readOrgSlugFromUrl,
  readPropertyIdFromUrl,
  resolveOrgAccessContext,
  resolveScopedPropertyAccess,
} from '../_shared/propertyScope.ts';
import { readParkingIdFromUrl, resolveScopedParkingAccess } from '../_shared/parkingScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('dashboard-stats', async (req) => {
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
  let scopedPropertyIds: string[] | undefined;
  let scopedParkingIds: string[] | undefined;

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
    if (!ctx.canListAllProperties) {
      const assigned = await resolveAssignedListingIdsForOrgUser(ctx.user.id, ctx.org.id);
      scopedPropertyIds = assigned.propertyIds;
      scopedParkingIds = assigned.parkingIds;
    }
  } else {
    return jsonError(req, 'property_id, parking_id, or org_slug is required', 400);
  }

  const data = await computeDashboardStats({
    propertyId,
    parkingId,
    orgId,
    scopedPropertyIds,
    scopedParkingIds,
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
  });

  return jsonSuccess(req, data);
});
