/**
 * parking-team-invitations — list, invite, resend, cancel parking invitations.
 * Auth: JWT + verifyParkingTeamAccess (team:view | team:invite).
 */

import {
  jsonError,
  jsonSuccess,
  parseAction,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { PARKING_TEAM_API_PERMISSIONS } from '../_shared/parkingTeamPermissions.ts';
import {
  cancelParkingInvitation,
  createParkingInvitation,
  listParkingTeamInvitations,
  readTeamParkingId,
  requireTeamParkingAccess,
  resendParkingInvitation,
} from '../_shared/parkingTeamService.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('parking-team-invitations', async (req) => {
  const url = new URL(req.url);
  const body = req.method === 'GET' ? {} : await readJsonBody(req);
  const parkingId = readTeamParkingId(url, body);

  if (req.method === 'GET') {
    const ctx = await requireTeamParkingAccess(
      req,
      parkingId,
      PARKING_TEAM_API_PERMISSIONS.listInvitations
    );
    const invitations = await listParkingTeamInvitations(ctx.parking.id);
    return jsonSuccess(req, { invitations });
  }

  if (req.method === 'POST') {
    requireHttpMethod(req, 'POST');
    const action = parseAction(body);

    if (action === 'resend') {
      const ctx = await requireTeamParkingAccess(
        req,
        parkingId,
        PARKING_TEAM_API_PERMISSIONS.resendInvitation
      );
      const invitationId = typeof body.invitationId === 'string' ? body.invitationId.trim() : '';
      if (!invitationId) {
        return jsonError(req, 'invitationId is required');
      }
      try {
        const invitation = await resendParkingInvitation(ctx, invitationId);
        return jsonSuccess(req, { invitation });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Resend failed';
        return jsonError(req, msg, 400);
      }
    }

    const ctx = await requireTeamParkingAccess(
      req,
      parkingId,
      PARKING_TEAM_API_PERMISSIONS.inviteMember
    );
    try {
      const invitation = await createParkingInvitation(ctx, body);
      return jsonSuccess(req, { invitation });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invite failed';
      const status = msg.includes('already') ? 409 : 400;
      return jsonError(req, msg, status);
    }
  }

  if (req.method === 'DELETE') {
    requireHttpMethod(req, 'DELETE');
    const ctx = await requireTeamParkingAccess(
      req,
      parkingId,
      PARKING_TEAM_API_PERMISSIONS.cancelInvitation
    );
    const invitationId =
      typeof body.invitationId === 'string'
        ? body.invitationId.trim()
        : (url.searchParams.get('invitationId')?.trim() ?? '');
    if (!invitationId) {
      return jsonError(req, 'invitationId is required');
    }
    try {
      await cancelParkingInvitation(ctx.parking.id, invitationId);
      return jsonSuccess(req, { cancelled: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cancel failed';
      return jsonError(req, msg, 400);
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
