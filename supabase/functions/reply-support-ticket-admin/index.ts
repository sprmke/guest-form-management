/**
 * reply-support-ticket-admin — POST super-admin reply to a ticket, notifies the host.
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 3.
 */

import { loadAuthUserProfile } from '../_shared/authUserProfile.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { sendSupportTicketReplyNotify } from '../_shared/emailService.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

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

serveSuperAdmin('reply-support-ticket-admin', async (req, adminUser) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const ticketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : '';
  if (!ticketId) return jsonError(req, 'ticketId is required');

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return jsonError(req, 'message is required');
  if (message.length > 5000) return jsonError(req, 'message must be 5000 characters or fewer');

  const sb = createServiceClient();

  const { data: ticket, error: ticketError } = await sb
    .from('support_tickets')
    .select('id, subject, submitted_by_email, status, organizations!inner(slug)')
    .eq('id', ticketId)
    .maybeSingle();

  if (ticketError) throw new Error(ticketError.message);
  if (!ticket) return jsonError(req, 'Ticket not found', 404);

  const org = ticket.organizations as unknown as { slug: string };
  const profile = await loadAuthUserProfile(sb, adminUser.id);
  const attachments = parseAttachments(body.attachments);

  const { data: created, error: insertError } = await sb
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: 'admin',
      sender_user_id: adminUser.id,
      sender_name: profile.name || 'Kame Homes Support',
      body: message,
      attachments,
    })
    .select('*')
    .single();

  if (insertError || !created) {
    return jsonError(req, `Failed to save reply: ${insertError?.message ?? 'unknown error'}`, 500);
  }

  if (ticket.status === 'open') {
    await sb.from('support_tickets').update({ status: 'in_progress' }).eq('id', ticketId);
  }

  try {
    await sendSupportTicketReplyNotify({
      id: ticketId,
      orgSlug: org.slug,
      subject: ticket.subject,
      submittedByEmail: ticket.submitted_by_email,
    });
  } catch (notifyErr) {
    console.error('[reply-support-ticket-admin] notify email failed (non-fatal):', notifyErr);
  }

  return jsonSuccess(req, { message: created });
});
