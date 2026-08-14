/**
 * Mark one notification, or all unread notifications in scope, as read for the caller.
 */

import { resolveNotificationsAccess } from '../_shared/notificationsAccess.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

/** Guardrail against an unbounded scan — matches the notifications-list unread cap. */
const MARK_ALL_CAP = 500;

serveAuthenticated('notifications-mark-read', async (req, user) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);
  const ctx = await resolveNotificationsAccess(req, body);
  const sb = createServiceClient();

  const markAll = body.markAll === true;
  const notificationId = typeof body.notificationId === 'string' ? body.notificationId.trim() : '';

  if (markAll) {
    let idsQuery = sb
      .from('notifications')
      .select('id, notification_reads!left(id)')
      .eq('organization_id', ctx.orgId)
      .eq('notification_reads.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MARK_ALL_CAP);

    if (ctx.propertyId) idsQuery = idsQuery.eq('property_id', ctx.propertyId);
    if (ctx.parkingId) idsQuery = idsQuery.eq('parking_id', ctx.parkingId);

    const { data: rows, error } = await idsQuery;
    if (error) return jsonError(req, error.message, 500);

    const unreadIds = (
      (rows ?? []) as { id: string; notification_reads: { id: string }[] | null }[]
    )
      .filter(
        (row) => !Array.isArray(row.notification_reads) || row.notification_reads.length === 0
      )
      .map((row) => row.id);

    if (unreadIds.length > 0) {
      const { error: insertError } = await sb.from('notification_reads').upsert(
        unreadIds.map((id) => ({ notification_id: id, user_id: user.id })),
        { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
      );
      if (insertError) return jsonError(req, insertError.message, 500);
    }

    return jsonSuccess(req, { markedCount: unreadIds.length });
  }

  if (!notificationId) {
    return jsonError(req, 'notificationId or markAll is required');
  }

  const { data: notification, error: notifError } = await sb
    .from('notifications')
    .select('id, organization_id, type, conversation_id')
    .eq('id', notificationId)
    .maybeSingle();
  if (notifError) return jsonError(req, notifError.message, 500);
  if (!notification || notification.organization_id !== ctx.orgId) {
    return jsonError(req, 'Notification not found', 404);
  }

  const idsToMark = [notificationId];
  if (notification.type === 'inbox_new_message' && notification.conversation_id) {
    const { data: siblingRows, error: siblingError } = await sb
      .from('notifications')
      .select('id')
      .eq('organization_id', ctx.orgId)
      .eq('type', 'inbox_new_message')
      .eq('conversation_id', notification.conversation_id);
    if (siblingError) return jsonError(req, siblingError.message, 500);
    for (const row of siblingRows ?? []) {
      if (row.id !== notificationId) idsToMark.push(row.id);
    }
  }

  const { error: insertError } = await sb.from('notification_reads').upsert(
    idsToMark.map((id) => ({ notification_id: id, user_id: user.id })),
    { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
  );
  if (insertError) return jsonError(req, insertError.message, 500);

  return jsonSuccess(req, { markedCount: idsToMark.length });
});
