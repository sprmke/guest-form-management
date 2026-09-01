/**
 * reply-support-ticket — POST host/guest adds a reply to an existing ticket thread.
 */

import { loadAuthUserProfile } from '../_shared/authUserProfile.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { sendSupportTicketSubmitterReplyNotify } from '../_shared/emailService.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { touchSupportTicketActivity } from '../_shared/supportTicketAccess.ts';
import { validateSupportTicketAttachments } from '../_shared/supportTicketAttachments.ts';
import { resolveSupportTicketScope } from '../_shared/supportTicketScope.ts';
import { canSubmitterReply, statusAfterSubmitterReply } from '../_shared/supportTicketStatus.ts';

serveAuthenticated('reply-support-ticket', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const ticketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : '';
  if (!ticketId) return jsonError(req, 'ticketId is required');

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return jsonError(req, 'message is required');
  if (message.length > 5000) return jsonError(req, 'message must be 5000 characters or fewer');

  const scope = await resolveSupportTicketScope(req, {
    orgSlug: typeof body.orgSlug === 'string' ? body.orgSlug : null,
    orgId: typeof body.orgId === 'string' ? body.orgId : null,
    propertyId: typeof body.propertyId === 'string' ? body.propertyId : null,
    parkingId: typeof body.parkingId === 'string' ? body.parkingId : null,
  });

  let attachments;
  try {
    attachments = validateSupportTicketAttachments(body.attachments, scope);
  } catch {
    return jsonError(req, 'Invalid attachment path', 400);
  }

  const sb = createServiceClient();

  let ticketQuery = sb
    .from('support_tickets')
    .select('id, status, subject, category')
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

  if (!canSubmitterReply(ticket.status)) {
    return jsonError(req, 'This ticket is closed. Reopen it before sending a reply.', 409);
  }

  const profile = await loadAuthUserProfile(sb, scope.user.id);
  const senderType = scope.channel === 'guest' ? 'guest' : 'host';

  const { data: created, error: insertError } = await sb
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: senderType,
      sender_user_id: scope.user.id,
      sender_name: profile.name,
      body: message,
      attachments,
    })
    .select('*')
    .single();

  if (insertError || !created) {
    return jsonError(req, `Failed to save reply: ${insertError?.message ?? 'unknown error'}`, 500);
  }

  const nextStatus = statusAfterSubmitterReply(ticket.status);
  await touchSupportTicketActivity(sb, ticketId, nextStatus ?? undefined);

  try {
    await sendSupportTicketSubmitterReplyNotify({
      ticketId,
      subject: ticket.subject,
      category: ticket.category,
      submittedByName: profile.name,
      submittedByEmail: profile.email || scope.user.email,
      bodyPreview: message,
      organizationName: scope.org?.name ?? 'Explore guest',
      propertyName: scope.propertyName,
      parkingName: scope.parkingName,
    });
  } catch (notifyErr) {
    console.error('[reply-support-ticket] team notify failed (non-fatal):', notifyErr);
  }

  return jsonSuccess(req, { message: created });
});
