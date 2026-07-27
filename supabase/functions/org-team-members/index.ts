/**
 * org-team-members — list, update, remove organization team members.
 * Auth: JWT + verifyOrgTeamAccess.
 */

import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import {
  listOrgTeamMembers,
  readTeamOrgId,
  readTeamOrgSlug,
  removeOrgTeamMember,
  requireOrgTeamContext,
  updateOrgTeamMember,
} from '../_shared/orgTeamService.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('org-team-members', async (req) => {
  const url = new URL(req.url);
  const body = req.method === 'GET' ? {} : await readJsonBody(req);
  const orgId = readTeamOrgId(url, body);
  const orgSlug = readTeamOrgSlug(url);

  if (req.method === 'GET') {
    const ctx = await requireOrgTeamContext(req, orgId, orgSlug);
    const members = await listOrgTeamMembers(ctx);
    return jsonSuccess(req, {
      members,
      access: {
        canManage: ctx.canManage,
        accessKind: ctx.accessKind,
      },
    });
  }

  if (req.method === 'PATCH') {
    requireHttpMethod(req, 'PATCH');
    const ctx = await requireOrgTeamContext(req, orgId, orgSlug);
    try {
      const member = await updateOrgTeamMember(ctx, body);
      return jsonSuccess(req, { member });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      const status = msg === 'Access restricted' ? 403 : msg === 'Member not found' ? 404 : 400;
      return jsonError(req, msg, status);
    }
  }

  if (req.method === 'DELETE') {
    requireHttpMethod(req, 'DELETE');
    const ctx = await requireOrgTeamContext(req, orgId, orgSlug, {
      requireManage: true,
    });
    const memberId =
      typeof body.memberId === 'string'
        ? body.memberId.trim()
        : (url.searchParams.get('memberId')?.trim() ?? '');
    if (!memberId) {
      return jsonError(req, 'memberId is required');
    }
    try {
      await removeOrgTeamMember(ctx, memberId);
      return jsonSuccess(req, { removed: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Remove failed';
      return jsonError(req, msg, 400);
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
