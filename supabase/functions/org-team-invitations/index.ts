/**
 * org-team-invitations — list, invite, resend, cancel organization invitations.
 * Auth: JWT + verifyOrgTeamAccess.
 */

import {
  jsonError,
  jsonSuccess,
  parseAction,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import {
  cancelOrgInvitation,
  createOrgInvitation,
  listOrgTeamInvitations,
  readTeamOrgId,
  readTeamOrgSlug,
  requireOrgTeamContext,
  resendOrgInvitation,
} from '../_shared/orgTeamService.ts';
import { catchPlanFeatureError } from '../_shared/planEntitlements.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('org-team-invitations', async (req) => {
  const url = new URL(req.url);
  const body = req.method === 'GET' ? {} : await readJsonBody(req);
  const orgId = readTeamOrgId(url, body);
  const orgSlug = readTeamOrgSlug(url);

  if (req.method === 'GET') {
    const ctx = await requireOrgTeamContext(req, orgId, orgSlug);
    const invitations = await listOrgTeamInvitations(ctx.org.id);
    return jsonSuccess(req, { invitations });
  }

  if (req.method === 'POST') {
    requireHttpMethod(req, 'POST');
    const action = parseAction(body);

    if (action === 'resend') {
      const ctx = await requireOrgTeamContext(req, orgId, orgSlug, {
        requireManage: true,
      });
      const invitationId = typeof body.invitationId === 'string' ? body.invitationId.trim() : '';
      if (!invitationId) {
        return jsonError(req, 'invitationId is required');
      }
      try {
        const invitation = await resendOrgInvitation(ctx, invitationId);
        return jsonSuccess(req, { invitation });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Resend failed';
        return jsonError(req, msg, 400);
      }
    }

    const ctx = await requireOrgTeamContext(req, orgId, orgSlug, {
      requireInvite: true,
    });
    try {
      const invitation = await createOrgInvitation(ctx, body);
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
    const ctx = await requireOrgTeamContext(req, orgId, orgSlug, {
      requireManage: true,
    });
    const invitationId =
      typeof body.invitationId === 'string'
        ? body.invitationId.trim()
        : (url.searchParams.get('invitationId')?.trim() ?? '');
    if (!invitationId) {
      return jsonError(req, 'invitationId is required');
    }
    try {
      await cancelOrgInvitation(ctx.org.id, invitationId);
      return jsonSuccess(req, { cancelled: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cancel failed';
      return jsonError(req, msg, 400);
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
