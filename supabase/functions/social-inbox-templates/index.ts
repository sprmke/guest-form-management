/**
 * Quick reply template CRUD for Guest Inbox (org-scoped data; property/parking manage ACL).
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { seedDefaultInboxQuickRepliesIfEmpty } from '../_shared/inboxDefaultQuickReplies.ts';
import { resolveInboxAccess } from '../_shared/inboxAccess.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('social-inbox-templates', async (req) => {
  const body =
    req.method === 'GET' || req.method === 'DELETE'
      ? null
      : ((await readJsonBody(req)) as Record<string, unknown>);
  const ctx = await resolveInboxAccess(req, 'manage', body);
  const sb = createServiceClient();

  if (req.method === 'GET') {
    await seedDefaultInboxQuickRepliesIfEmpty(ctx.orgId);
    const { data, error } = await sb
      .from('social_reply_templates')
      .select('*')
      .eq('organization_id', ctx.orgId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
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
