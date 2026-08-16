/**
 * Resolve Notification Center access for org, property, or parking scope.
 *
 * Gated on `org:dashboard:view` (org scope) / `bookings:view` (property/parking
 * scope) — NOT `notifications:view` / `notifications:edit`, which gate the
 * unrelated Telegram outbound-alert settings pages (propertyTeamPermissions.ts).
 */

import {
  verifyOrgAccess,
  verifyParkingTeamAccess,
  verifyPropertyAccess,
  type OrgRow,
} from './orgAuth.ts';

export type NotificationsAccessContext = {
  org: OrgRow;
  orgId: string;
  propertyId: string | null;
  parkingId: string | null;
};

function readScopeFromUrl(url: URL): {
  orgId: string | null;
  orgSlug: string | null;
  propertyId: string | null;
  parkingId: string | null;
} {
  const orgId = url.searchParams.get('org_id')?.trim() || null;
  const orgSlug = url.searchParams.get('org_slug')?.trim() || null;
  const propertyId = url.searchParams.get('property_id')?.trim() || null;
  const parkingId = url.searchParams.get('parking_id')?.trim() || null;
  return { orgId, orgSlug, propertyId, parkingId };
}

function readScopeFromBody(body: Record<string, unknown> | null | undefined): {
  orgId: string | null;
  orgSlug: string | null;
  propertyId: string | null;
  parkingId: string | null;
} {
  const orgId =
    typeof body?.orgId === 'string'
      ? body.orgId.trim()
      : typeof body?.org_id === 'string'
        ? body.org_id.trim()
        : null;
  const orgSlug =
    typeof body?.orgSlug === 'string'
      ? body.orgSlug.trim()
      : typeof body?.org_slug === 'string'
        ? body.org_slug.trim()
        : null;
  const propertyId =
    typeof body?.propertyId === 'string'
      ? body.propertyId.trim()
      : typeof body?.property_id === 'string'
        ? body.property_id.trim()
        : null;
  const parkingId =
    typeof body?.parkingId === 'string'
      ? body.parkingId.trim()
      : typeof body?.parking_id === 'string'
        ? body.parking_id.trim()
        : null;
  return {
    orgId: orgId || null,
    orgSlug: orgSlug || null,
    propertyId: propertyId || null,
    parkingId: parkingId || null,
  };
}

/**
 * Auth for notification endpoints. Prefer URL query `org_id` / `org_slug` /
 * `property_id` / `parking_id`; body fields are merged when provided (POST).
 * Exactly one scope must resolve — org takes precedence when more than one
 * is sent (matches scopedOrgFunctionsUrl, which sends org_slug as a fallback
 * when org_id isn't resolved yet on the client).
 */
export async function resolveNotificationsAccess(
  req: Request,
  body?: Record<string, unknown> | null
): Promise<NotificationsAccessContext> {
  const url = new URL(req.url);
  const fromUrl = readScopeFromUrl(url);
  const fromBody = readScopeFromBody(body);
  const orgId = fromUrl.orgId ?? fromBody.orgId;
  const orgSlug = fromUrl.orgSlug ?? fromBody.orgSlug;
  const propertyId = fromUrl.propertyId ?? fromBody.propertyId;
  const parkingId = fromUrl.parkingId ?? fromBody.parkingId;

  if (orgId || orgSlug) {
    const ctx = await verifyOrgAccess(
      req,
      { orgId: orgId ?? undefined, orgSlug: orgSlug ?? undefined },
      'org:dashboard:view'
    );
    return { org: ctx.org, orgId: ctx.org.id, propertyId: null, parkingId: null };
  }

  if (propertyId) {
    const ctx = await verifyPropertyAccess(req, propertyId, 'bookings:view');
    return { org: ctx.org, orgId: ctx.org.id, propertyId, parkingId: null };
  }

  if (parkingId) {
    const ctx = await verifyParkingTeamAccess(req, parkingId, 'bookings:view');
    return { org: ctx.org, orgId: ctx.org.id, propertyId: null, parkingId };
  }

  throw new Response(
    JSON.stringify({
      success: false,
      error: 'org_id, property_id, or parking_id is required',
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
