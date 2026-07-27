/**
 * property-team-custom-roles — CRUD custom roles for a property.
 * Auth: JWT + verifyPropertyAccess (team:view | team:manage).
 */

import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { TEAM_API_PERMISSIONS } from '../_shared/propertyTeamPermissions.ts';
import {
  createPropertyCustomRole,
  deletePropertyCustomRole,
  listPropertyCustomRoles,
  readTeamPropertyId,
  requireTeamPropertyAccess,
  updatePropertyCustomRole,
} from '../_shared/propertyTeamService.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('property-team-custom-roles', async (req) => {
  const url = new URL(req.url);
  const body = req.method === 'GET' ? {} : await readJsonBody(req);
  const propertyId = readTeamPropertyId(url, body);

  if (req.method === 'GET') {
    const ctx = await requireTeamPropertyAccess(
      req,
      propertyId,
      TEAM_API_PERMISSIONS.listCustomRoles
    );
    const customRoles = await listPropertyCustomRoles(ctx.property.id);
    return jsonSuccess(req, { customRoles });
  }

  if (req.method === 'POST') {
    requireHttpMethod(req, 'POST');
    const ctx = await requireTeamPropertyAccess(
      req,
      propertyId,
      TEAM_API_PERMISSIONS.createCustomRole
    );
    try {
      const customRole = await createPropertyCustomRole(ctx, body);
      return jsonSuccess(req, { customRole });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Create failed';
      const status = msg.includes('already exists') ? 409 : 400;
      return jsonError(req, msg, status);
    }
  }

  if (req.method === 'PATCH') {
    requireHttpMethod(req, 'PATCH');
    const ctx = await requireTeamPropertyAccess(
      req,
      propertyId,
      TEAM_API_PERMISSIONS.updateCustomRole
    );
    try {
      const customRole = await updatePropertyCustomRole(ctx, body);
      return jsonSuccess(req, { customRole });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      const status = msg.includes('already exists') ? 409 : 400;
      return jsonError(req, msg, status);
    }
  }

  if (req.method === 'DELETE') {
    requireHttpMethod(req, 'DELETE');
    const ctx = await requireTeamPropertyAccess(
      req,
      propertyId,
      TEAM_API_PERMISSIONS.deleteCustomRole
    );
    const roleId =
      typeof body.roleId === 'string'
        ? body.roleId.trim()
        : (url.searchParams.get('roleId')?.trim() ?? '');
    if (!roleId) {
      return jsonError(req, 'roleId is required');
    }
    try {
      await deletePropertyCustomRole(ctx, roleId);
      return jsonSuccess(req, { deleted: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      return jsonError(req, msg, 400);
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
