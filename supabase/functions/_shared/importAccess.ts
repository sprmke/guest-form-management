/**
 * Import access — org ↔ property permission pairing (mirrors inboxAccess.ts).
 *
 * org:import:manage ↔ import:manage
 * Property-scoped endpoints require property_id; verifyPropertyAccess layers org owner/admin.
 */

import { verifyPropertyAccess, type PropertyAccessContext } from './orgAuth.ts';
import type { OrgPermissionId } from './orgTeamPermissions.ts';
import { catchPlanFeatureError, requirePropertyFeature } from './planEntitlements.ts';
import type { TeamPermissionId } from './propertyTeamPermissions.ts';
import { readPropertyIdFromUrl } from './propertyScope.ts';

const ORG_PERM: OrgPermissionId = 'org:import:manage';
const SCOPE_PERM: TeamPermissionId = 'import:manage';

export type ImportAccessContext = PropertyAccessContext & {
  orgId: string;
  propertyId: string;
};

/** @internal Documents org↔property permission pairing for import endpoints. */
export const IMPORT_ACCESS_PERMISSIONS = {
  org: ORG_PERM,
  property: SCOPE_PERM,
} as const;

export async function resolveImportAccess(req: Request): Promise<ImportAccessContext> {
  const url = new URL(req.url);
  const propertyId = readPropertyIdFromUrl(url);
  if (!propertyId) {
    throw new Response(JSON.stringify({ success: false, error: 'property_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ctx = await verifyPropertyAccess(req, propertyId, SCOPE_PERM);
  return {
    ...ctx,
    orgId: ctx.org.id,
    propertyId,
  };
}

/** Starter+ gate for match / preview / commit (upload + cancel stay open for preview). */
export async function requireImportPlanFeature(
  req: Request,
  propertyId: string
): Promise<Response | null> {
  try {
    await requirePropertyFeature(propertyId, 'bookingImport');
    return null;
  } catch (err) {
    return catchPlanFeatureError(req, err);
  }
}
