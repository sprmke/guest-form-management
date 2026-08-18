/**
 * property-team-invitations — list, invite, resend, cancel property invitations.
 * Auth: JWT + verifyPropertyAccess (team:view | team:invite).
 */

import {
  jsonError,
  jsonSuccess,
  parseAction,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { catchPlanFeatureError, requireTeamInviteAllowed } from '../_shared/planEntitlements.ts';
import { TEAM_API_PERMISSIONS } from '../_shared/propertyTeamPermissions.ts';
import {
  cancelPropertyInvitation,
  createPropertyInvitation,
  listPropertyTeamInvitations,
  readTeamPropertyId,
  requireTeamPropertyAccess,
  resendPropertyInvitation,
} from '../_shared/propertyTeamService.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('property-team-invitations', async (req) => {
  const url = new URL(req.url);
  const body = req.method === 'GET' ? {} : await readJsonBody(req);
  const propertyId = readTeamPropertyId(url, body);

  if (req.method === 'GET') {
    const ctx = await requireTeamPropertyAccess(
      req,
      propertyId,
      TEAM_API_PERMISSIONS.listInvitations
    );
    const invitations = await listPropertyTeamInvitations(ctx.property.id);
    return jsonSuccess(req, { invitations });
  }

  if (req.method === 'POST') {
    requireHttpMethod(req, 'POST');
    const action = parseAction(body);

    if (action === 'resend') {
      const ctx = await requireTeamPropertyAccess(
        req,
        propertyId,
        TEAM_API_PERMISSIONS.resendInvitation
      );
      const invitationId = typeof body.invitationId === 'string' ? body.invitationId.trim() : '';
      if (!invitationId) {
        return jsonError(req, 'invitationId is required');
      }
      try {
        const invitation = await resendPropertyInvitation(ctx, invitationId);
        return jsonSuccess(req, { invitation });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Resend failed';
        return jsonError(req, msg, 400);
      }
    }

    const ctx = await requireTeamPropertyAccess(req, propertyId, TEAM_API_PERMISSIONS.inviteMember);
    try {
      await requireTeamInviteAllowed(ctx.property.id);
      const invitation = await createPropertyInvitation(ctx, body);
      return jsonSuccess(req, { invitation });
    } catch (e) {
      const planErr = catchPlanFeatureError(req, e);
      if (planErr) return planErr;
      const msg = e instanceof Error ? e.message : 'Invite failed';
      const status = msg.includes('already') ? 409 : 400;
      return jsonError(req, msg, status);
    }
  }

  if (req.method === 'DELETE') {
    requireHttpMethod(req, 'DELETE');
    const ctx = await requireTeamPropertyAccess(
      req,
      propertyId,
      TEAM_API_PERMISSIONS.cancelInvitation
    );
    const invitationId =
      typeof body.invitationId === 'string'
        ? body.invitationId.trim()
        : (url.searchParams.get('invitationId')?.trim() ?? '');
    if (!invitationId) {
      return jsonError(req, 'invitationId is required');
    }
    try {
      await cancelPropertyInvitation(ctx.property.id, invitationId);
      return jsonSuccess(req, { cancelled: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cancel failed';
      return jsonError(req, msg, 400);
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
