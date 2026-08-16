/**
 * accept-org-invite — accept a pending organization invitation after Google sign-in.
 * Auth: JWT (invitee). Body: { token }.
 */

import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { acceptOrgInvitation } from '../_shared/orgTeamService.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('accept-org-invite', async (req, user) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return jsonError(req, 'token is required');
  }

  try {
    const result = await acceptOrgInvitation(user.id, user.email, token);
    return jsonSuccess(req, result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Accept failed';
    const status = msg.includes('not found')
      ? 404
      : msg.includes('email must match')
        ? 403
        : msg.includes('expired') || msg.includes('no longer valid')
          ? 410
          : 400;
    return jsonError(req, msg, status);
  }
});
