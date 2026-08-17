/**
 * get-support-ticket — GET a single ticket + its reply thread.
 * Any active member of the ticket's org can view (not restricted to the submitter —
 * matches support_tickets RLS, which is org-scoped, not per-user).
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 3.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { resolveSupportTicketScope } from '../_shared/supportTicketScope.ts';

const BUCKET = 'support-ticket-attachments';
const SIGNED_URL_TTL_SEC = 60 * 30;

type StoredAttachment = { name: string; mimeType: string; size: number; path: string };

serveAuthenticated('get-support-ticket', async (req) => {
  requireHttpMethod(req, 'GET');
  const url = new URL(req.url);
  const ticketId = url.searchParams.get('ticket_id')?.trim();
  if (!ticketId) return jsonError(req, 'ticket_id is required');

  const scope = await resolveSupportTicketScope(req, {
    orgSlug: url.searchParams.get('org_slug'),
    orgId: url.searchParams.get('org_id'),
    propertyId: url.searchParams.get('property_id'),
    parkingId: url.searchParams.get('parking_id'),
  });

  const sb = createServiceClient();

  const { data: ticket, error: ticketError } = await sb
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('organization_id', scope.org.id)
    .maybeSingle();

  if (ticketError) throw new Error(ticketError.message);
  if (!ticket) return jsonError(req, 'Ticket not found', 404);

  const { data: messages, error: messagesError } = await sb
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (messagesError) throw new Error(messagesError.message);

  const signedMessages = await Promise.all(
    (messages ?? []).map(async (message) => {
      const attachments = (message.attachments as StoredAttachment[] | null) ?? [];
      if (attachments.length === 0) return message;

      const withUrls = await Promise.all(
        attachments.map(async (attachment) => {
          const { data: signed } = await sb.storage
            .from(BUCKET)
            .createSignedUrl(attachment.path, SIGNED_URL_TTL_SEC);
          return { ...attachment, url: signed?.signedUrl ?? null };
        })
      );
      return { ...message, attachments: withUrls };
    })
  );

  return jsonSuccess(req, { ticket, messages: signedMessages });
});
