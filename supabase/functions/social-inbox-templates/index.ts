/**
 * Quick reply template CRUD for Guest Inbox (org-scoped for property; parking-scoped for parking; property/parking manage ACL).
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { seedDefaultInboxQuickRepliesIfEmpty } from '../_shared/inboxDefaultQuickReplies.ts';
import { resolveInboxAccess } from '../_shared/inboxAccess.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import {
  catchPlanFeatureError,
  requireOrgPropertyFeature,
  requirePropertyFeature,
} from '../_shared/planEntitlements.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('social-inbox-templates', async (req) => {
  const body =
    req.method === 'GET' || req.method === 'DELETE'
      ? null
      : ((await readJsonBody(req)) as Record<string, unknown>);
  const capability =
    req.method === 'GET'
      ? 'quick_replies'
      : req.method === 'POST'
        ? 'quick_replies_add'
        : req.method === 'PATCH'
          ? 'quick_replies_edit'
          : req.method === 'DELETE'
            ? 'quick_replies_delete'
            : 'manage';
  const ctx = await resolveInboxAccess(req, capability, body);
  const sb = createServiceClient();

  if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      if (ctx.propertyId) {
        await requirePropertyFeature(ctx.propertyId, 'quickReplies');
      } else {
        await requireOrgPropertyFeature(ctx.orgId, 'quickReplies');
      }
    } catch (err) {
      const planErr = catchPlanFeatureError(req, err);
      if (planErr) return planErr;
      throw err;
    }
  }

  if (req.method === 'GET') {
    await seedDefaultInboxQuickRepliesIfEmpty(ctx.orgId, ctx.parkingId);
    const listQuery = sb
      .from('social_reply_templates')
      .select('*')
      .eq('organization_id', ctx.orgId)
      .eq('is_active', true);
    const { data, error } = await (
      ctx.parkingId ? listQuery.eq('parking_id', ctx.parkingId) : listQuery.is('parking_id', null)
    ).order('sort_order', { ascending: true });
    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, { templates: data ?? [] });
  }

  if (req.method === 'POST') {
    const title = String(body?.title ?? '').trim();
    const bodyText = String(body?.bodyText ?? body?.body_text ?? '').trim();
    if (!title || !bodyText) {
      return jsonError(req, 'title and bodyText required', 400);
    }
    const { data, error } = await sb
      .from('social_reply_templates')
      .insert({
        organization_id: ctx.orgId,
        parking_id: ctx.parkingId,
        title,
        body_text: bodyText,
        platform: body?.platform ?? null,
        conversation_type: body?.conversationType ?? 'all',
        sort_order: Number(body?.sortOrder ?? 0),
      })
      .select('*')
      .single();
    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, { template: data });
  }

  if (req.method === 'PATCH') {
    const id = String(body?.id ?? '').trim();
    if (!id) return jsonError(req, 'id required', 400);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body?.title === 'string') patch.title = body.title.trim();
    if (typeof body?.bodyText === 'string') patch.body_text = body.bodyText.trim();
    if (typeof body?.body_text === 'string') patch.body_text = body.body_text.trim();
    if (body?.platform !== undefined) patch.platform = body.platform;
    if (body?.conversationType !== undefined) patch.conversation_type = body.conversationType;
    if (body?.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder);
    if (body?.isActive !== undefined) patch.is_active = Boolean(body.isActive);
    const { data, error } = await sb
      .from('social_reply_templates')
      .update(patch)
      .eq('organization_id', ctx.orgId)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, { template: data });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const id = url.searchParams.get('id')?.trim();
    if (!id) return jsonError(req, 'id required', 400);
    const { error } = await sb
      .from('social_reply_templates')
      .delete()
      .eq('organization_id', ctx.orgId)
      .eq('id', id);
    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, { deleted: true });
  }

  return jsonError(req, 'Method not allowed', 405);
});
