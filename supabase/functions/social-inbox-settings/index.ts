/**
 * Org inbox automation settings (AI auto-reply toggles).
 */

import { ensureSocialInboxSettings, socialInboxDb } from '../_shared/socialInboxService.ts';
import { checkInboxAiProviders } from '../_shared/socialInboxAiService.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('social-inbox-settings', async (req) => {
  const ctx = await resolveOrgAccessContext(req, 'org:inbox:manage');
  await ensureSocialInboxSettings(ctx.org.id);
  const sb = socialInboxDb();

  if (req.method === 'GET') {
    const { data } = await sb
      .from('social_inbox_settings')
      .select('*')
      .eq('organization_id', ctx.org.id)
      .maybeSingle();
    const aiStatus = await checkInboxAiProviders();
    return jsonSuccess(req, {
      autoReplyEnabled: data?.auto_reply_enabled ?? false,
      autoReplyMode: data?.auto_reply_mode ?? 'draft',
      aiSystemPrompt: data?.ai_system_prompt ?? '',
      platformToggles: data?.platform_toggles ?? {},
      aiAvailable: aiStatus.available,
      aiError: aiStatus.error,
    });
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.autoReplyEnabled !== undefined) {
      patch.auto_reply_enabled = Boolean(body.autoReplyEnabled);
    }
    if (body.autoReplyMode === 'draft' || body.autoReplyMode === 'send') {
      patch.auto_reply_mode = body.autoReplyMode;
    }
    if (typeof body.aiSystemPrompt === 'string') {
      patch.ai_system_prompt = body.aiSystemPrompt.trim() || null;
    }
    if (body.platformToggles && typeof body.platformToggles === 'object') {
      patch.platform_toggles = body.platformToggles;
    }
    const { data, error } = await sb
      .from('social_inbox_settings')
      .update(patch)
      .eq('organization_id', ctx.org.id)
      .select('*')
      .single();
    if (error) return jsonError(req, error.message, 500);
    const aiStatus = await checkInboxAiProviders();
    return jsonSuccess(req, {
      autoReplyEnabled: data.auto_reply_enabled,
      autoReplyMode: data.auto_reply_mode,
      aiSystemPrompt: data.ai_system_prompt ?? '',
      platformToggles: data.platform_toggles ?? {},
      aiAvailable: aiStatus.available,
      aiError: aiStatus.error,
    });
  }

  return jsonError(req, 'Method not allowed', 405);
});
