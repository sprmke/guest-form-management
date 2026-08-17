/**
 * update-support-ticket-status — POST super-admin status/priority update.
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 3.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high'];

serveSuperAdmin('update-support-ticket-status', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const ticketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : '';
  if (!ticketId) return jsonError(req, 'ticketId is required');

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !STATUSES.includes(body.status)) {
      return jsonError(req, 'status must be open, in_progress, resolved, or closed');
    }
    updates.status = body.status;
  }

  if (body.priority !== undefined) {
    if (body.priority !== null && (typeof body.priority !== 'string' || !PRIORITIES.includes(body.priority))) {
      return jsonError(req, 'priority must be low, medium, high, or null');
    }
    updates.priority = body.priority;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError(req, 'status or priority is required');
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return jsonError(req, 'Ticket not found', 404);

  return jsonSuccess(req, { ticket: data });
});
