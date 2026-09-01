/**
 * reopen-support-ticket — POST host/guest reopens a closed ticket (no message).
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { touchSupportTicketActivity } from '../_shared/supportTicketAccess.ts';
import { resolveSupportTicketScope } from '../_shared/supportTicketScope.ts';
import { statusAfterReopen } from '../_shared/supportTicketStatus.ts';

serveAuthenticated('reopen-support-ticket', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const ticketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : '';
  if (!ticketId) return jsonError(req, 'ticketId is required');

  const scope = await resolveSupportTicketScope(req, {
    orgSlug: typeof body.orgSlug === 'string' ? body.orgSlug : null,
    orgId: typeof body.orgId === 'string' ? body.orgId : null,
    propertyId: typeof body.propertyId === 'string' ? body.propertyId : null,
    parkingId: typeof body.parkingId === 'string' ? body.parkingId : null,
  });

  const sb = createServiceClient();

  let ticketQuery = sb
    .from('support_tickets')
    .select('id, status')
    .eq('id', ticketId)
    .eq('submitted_by_user_id', scope.user.id);
  if (scope.channel === 'guest') {
    ticketQuery = ticketQuery.eq('channel', 'guest');
  } else if (scope.org) {
    ticketQuery = ticketQuery.eq('organization_id', scope.org.id).eq('channel', 'host');
  }

  const { data: ticket, error: ticketError } = await ticketQuery.maybeSingle();

  if (ticketError) throw new Error(ticketError.message);
  if (!ticket) return jsonError(req, 'Ticket not found', 404);

  if (ticket.status !== 'closed') {
    return jsonError(req, 'Only closed tickets can be reopened this way', 409);
  }

  const nextStatus = statusAfterReopen();
  const { data: updated, error: updateError } = await sb
    .from('support_tickets')
    .update({ status: nextStatus })
    .eq('id', ticketId)
    .select('*')
    .single();

  if (updateError || !updated) {
    return jsonError(
      req,
      `Failed to reopen ticket: ${updateError?.message ?? 'unknown error'}`,
      500
    );
  }

  return jsonSuccess(req, { ticket: updated });
});
