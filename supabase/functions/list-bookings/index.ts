/**
 * list-bookings — Admin paginated booking list.
 * Property scope: ?property_id=… (default — first accessible property)
 * Org scope: ?org_slug=… or ?org_id=… (all org properties; optional ?property_id= filter)
 */

import { DatabaseService } from '../_shared/databaseService.ts';
import { jsonResponse } from '../_shared/httpResponse.ts';
import {
  listPropertyIdsForOrganization,
  readOrgIdFromUrl,
  readOrgSlugFromUrl,
  readPropertyIdFromUrl,
  resolveOrgAccessContext,
  resolveScopedPropertyAccess,
} from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('list-bookings', async (req) => {
  const url = new URL(req.url);
  const p = url.searchParams;
  const explicitPropertyId = readPropertyIdFromUrl(url);
  const orgSlug = readOrgSlugFromUrl(url);
  const orgIdParam = readOrgIdFromUrl(url);

  let propertyId: string | undefined;
  let propertyIds: string[] | undefined;
  let includePropertyMeta = false;

  if (orgSlug || orgIdParam) {
    const ctx = await resolveOrgAccessContext(req, 'org:bookings:view');
    propertyIds = await listPropertyIdsForOrganization(ctx.org.id);
    includePropertyMeta = true;

    if (explicitPropertyId) {
      const { property } = await resolveScopedPropertyAccess(
        req,
        'bookings:view',
        explicitPropertyId
      );
      if (!propertyIds.includes(property.id)) {
        return jsonResponse(req, { success: false, error: 'Property not in organization' }, 403);
      }
      propertyId = property.id;
      propertyIds = undefined;
      includePropertyMeta = true;
    }
  } else if (explicitPropertyId) {
    const { property } = await resolveScopedPropertyAccess(
      req,
      'bookings:view',
      explicitPropertyId
    );
    propertyId = property.id;
  } else {
    const { property } = await resolveScopedPropertyAccess(req, 'bookings:view');
    propertyId = property.id;
  }

  const q = p.get('q') ?? '';
  const statusRaw = p.getAll('status');
  const from = p.get('from') ?? null;
  const to = p.get('to') ?? null;
  const hasPets =
    p.get('has_pets') === 'true' ? true : p.get('has_pets') === 'false' ? false : null;
  const needParking =
    p.get('need_parking') === 'true' ? true : p.get('need_parking') === 'false' ? false : null;
  const showCompletedBookings =
    p.get('show_completed_bookings') === 'true' ||
    p.get('show_previous_bookings') === 'true' ||
    p.get('hide_stale_completed') === 'false';
  const sort = (p.get('sort') ?? 'status_priority:asc') as
    | 'status_priority:asc'
    | 'check_in_date:asc'
    | 'check_in_date:desc'
    | 'created_at:asc'
    | 'created_at:desc';
  const page = Math.max(1, parseInt(p.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '31', 10)));

  const { rows, total } = await DatabaseService.listBookings({
    propertyId,
    propertyIds,
    includePropertyMeta,
    q,
    status: statusRaw,
    from,
    to,
    hasPets,
    needParking,
    sort,
    page,
    limit,
    showCompletedBookings,
  });

  return jsonResponse(req, { success: true, data: rows, total, page, limit });
});
