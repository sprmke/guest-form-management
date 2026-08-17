/**
 * submit-support-ticket — POST creates a support ticket + its first message.
 * Auth: org/property/parking scoped (whichever the host filed it from), no
 * dedicated permission gate — Help & Support is visible to every team member.
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 3.
 */

import { loadAuthUserProfile } from '../_shared/authUserProfile.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { sendSupportTicketNotify } from '../_shared/emailService.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { resolveSupportTicketScope } from '../_shared/supportTicketScope.ts';

const CATEGORIES = ['bug_report', 'feature_suggestion', 'general_inquiry', 'business_inquiry'];
const SEVERITIES = ['low', 'medium', 'high'];

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

serveAuthenticated('submit-support-ticket', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const category = typeof body.category === 'string' ? body.category : '';
  if (!CATEGORIES.includes(category)) {
    return jsonError(req, 'category must be one of bug_report, feature_suggestion, general_inquiry, business_inquiry');
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  if (!subject) return jsonError(req, 'subject is required');
  if (subject.length > 200) return jsonError(req, 'subject must be 200 characters or fewer');

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!description) return jsonError(req, 'description is required');
  if (description.length > 5000) return jsonError(req, 'description must be 5000 characters or fewer');

  const scope = await resolveSupportTicketScope(req, {
    orgSlug: typeof body.orgSlug === 'string' ? body.orgSlug : null,
    orgId: typeof body.orgId === 'string' ? body.orgId : null,
    propertyId: typeof body.propertyId === 'string' ? body.propertyId : null,
    parkingId: typeof body.parkingId === 'string' ? body.parkingId : null,
  });

  const categoryFields: Record<string, unknown> = {};
  if (category === 'bug_report') {
    const severity = typeof body.severity === 'string' ? body.severity : 'medium';
    if (!SEVERITIES.includes(severity)) return jsonError(req, 'severity must be low, medium, or high');
    categoryFields.severity = severity;
    if (typeof body.pageUrl === 'string' && body.pageUrl.trim()) {
      categoryFields.page_url = body.pageUrl.trim().slice(0, 500);
    }
    if (typeof body.browserInfo === 'string' && body.browserInfo.trim()) {
      categoryFields.browser_info = body.browserInfo.trim().slice(0, 500);
    }
  } else if (category === 'feature_suggestion') {
    if (typeof body.expectedBenefit === 'string' && body.expectedBenefit.trim()) {
      categoryFields.expected_benefit = body.expectedBenefit.trim().slice(0, 1000);
    }
  } else if (category === 'business_inquiry') {
    if (typeof body.contactPreference === 'string' && body.contactPreference.trim()) {
      categoryFields.contact_preference = body.contactPreference.trim().slice(0, 200);
    }
  }

  const attachments = parseAttachments(body.attachments);

  const sb = createServiceClient();
  const profile = await loadAuthUserProfile(sb, scope.user.id);

  const { data: ticket, error: ticketError } = await sb
    .from('support_tickets')
    .insert({
      organization_id: scope.org.id,
      property_id: scope.propertyId,
      parking_id: scope.parkingId,
      submitted_by_user_id: scope.user.id,
      submitted_by_name: profile.name,
      submitted_by_email: profile.email || scope.user.email,
      category,
      subject,
      category_fields: categoryFields,
    })
    .select('*')
    .single();

  if (ticketError || !ticket) {
    return jsonError(req, `Failed to create ticket: ${ticketError?.message ?? 'unknown error'}`, 500);
  }

  const { data: message, error: messageError } = await sb
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'host',
      sender_user_id: scope.user.id,
      sender_name: profile.name,
      body: description,
      attachments,
    })
    .select('*')
    .single();

  if (messageError || !message) {
    return jsonError(req, `Failed to save ticket message: ${messageError?.message ?? 'unknown error'}`, 500);
  }

  try {
    await sendSupportTicketNotify({
      organizationName: scope.org.name,
      propertyName: scope.propertyName,
      parkingName: scope.parkingName,
      category,
      subject,
      submittedByName: profile.name,
      submittedByEmail: profile.email || scope.user.email,
      bodyPreview: description,
    });
  } catch (notifyErr) {
    console.error('[submit-support-ticket] notify email failed (non-fatal):', notifyErr);
  }

  return jsonSuccess(req, { ticket, message });
});
