/**
 * reply-support-ticket — POST host adds a reply to an existing ticket thread.
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 3.
 */

import { loadAuthUserProfile } from '../_shared/authUserProfile.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { resolveSupportTicketScope } from '../_shared/supportTicketScope.ts';

type IncomingAttachment = { name: string; mimeType: string; size: number; path: string };

function parseAttachments(raw: unknown): IncomingAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .slice(0, 3)
    .map((item) => ({
      name: String(item.name ?? 'file').slice(0, 120),
      mimeType: String(item.mimeType ?? 'application/octet-stream'),
      size: typeof item.size === 'number' ? item.size : 0,
      path: String(item.path ?? ''),
    }))
    .filter((item) => item.path);
}

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

  const sb = createServiceClient();

  const { data: ticket, error: ticketError } = await sb
    .from('support_tickets')
    .select('id, status')
    .eq('id', ticketId)
    .eq('organization_id', scope.org.id)
    .maybeSingle();

  if (ticketError) throw new Error(ticketError.message);
  if (!ticket) return jsonError(req, 'Ticket not found', 404);

  const profile = await loadAuthUserProfile(sb, scope.user.id);
  const attachments = parseAttachments(body.attachments);

  const { data: created, error: insertError } = await sb
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: 'host',
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

  // A host reply on a resolved/closed ticket signals it needs another look.
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    await sb.from('support_tickets').update({ status: 'in_progress' }).eq('id', ticketId);
  }

  return jsonSuccess(req, { message: created });
});
