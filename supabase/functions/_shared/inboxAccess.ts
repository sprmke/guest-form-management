/**
 * Resolve Guest Inbox access for property or parking scope.
 * Org-level Inbox UI was removed — callers must pass property_id or parking_id.
 */

import { verifyParkingTeamAccess, verifyPropertyAccess, type OrgRow } from './orgAuth.ts';
import type { ParkingTeamPermissionId } from './parkingTeamPermissions.ts';
import type { TeamPermissionId } from './propertyTeamPermissions.ts';
import type { InboxScopeFilter } from './socialInboxTypes.ts';

export type InboxAccessKind = 'property' | 'parking';

export type InboxAccessContext = {
  kind: InboxAccessKind;
  org: OrgRow;
  orgId: string;
  propertyId: string | null;
  parkingId: string | null;
  scope: InboxScopeFilter;
};

const SCOPE_PERM: Record<'view' | 'reply' | 'manage', TeamPermissionId & ParkingTeamPermissionId> =
  {
    view: 'inbox:view',
    reply: 'inbox:reply',
    manage: 'inbox:manage',
  };

function readScopeFromUrl(url: URL): { propertyId: string | null; parkingId: string | null } {
  const propertyId = url.searchParams.get('property_id')?.trim() || null;
  const parkingId = url.searchParams.get('parking_id')?.trim() || null;
  return { propertyId, parkingId };
}

function readScopeFromBody(body: Record<string, unknown> | null | undefined): {
  propertyId: string | null;
  parkingId: string | null;
} {
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
    propertyId: propertyId || null,
    parkingId: parkingId || null,
  };
}

/**
 * Auth for inbox endpoints. Prefer URL query `property_id` / `parking_id`;
 * body fields are merged when provided (POST).
 */
export async function resolveInboxAccess(
  req: Request,
  capability: 'view' | 'reply' | 'manage',
  body?: Record<string, unknown> | null
): Promise<InboxAccessContext> {
  const url = new URL(req.url);
  const fromUrl = readScopeFromUrl(url);
  const fromBody = readScopeFromBody(body);
  const propertyId = fromUrl.propertyId ?? fromBody.propertyId;
  const parkingId = fromUrl.parkingId ?? fromBody.parkingId;

  if (propertyId && parkingId) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Pass only one of property_id or parking_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (propertyId) {
    const ctx = await verifyPropertyAccess(req, propertyId, SCOPE_PERM[capability]);
    return {
      kind: 'property',
      org: ctx.org,
      orgId: ctx.org.id,
      propertyId,
      parkingId: null,
      scope: { propertyId, parkingId: null },
    };
  }

  if (parkingId) {
    const ctx = await verifyParkingTeamAccess(req, parkingId, SCOPE_PERM[capability]);
    return {
      kind: 'parking',
      org: ctx.org,
      orgId: ctx.org.id,
      propertyId: null,
      parkingId,
      scope: { propertyId: null, parkingId },
    };
  }

  throw new Response(
    JSON.stringify({
      success: false,
      error: 'property_id or parking_id is required',
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
