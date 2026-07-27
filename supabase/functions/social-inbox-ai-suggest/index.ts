/**
 * AI reply suggestion for a conversation.
 */

import { suggestInboxReply } from '../_shared/socialInboxAiService.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { getConversationById, listMessages } from '../_shared/socialInboxService.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('social-inbox-ai-suggest', async (req) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const ctx = await resolveOrgAccessContext(req, 'org:inbox:reply');
  const body = await readJsonBody(req);
  const conversationId = String(body.conversationId ?? '').trim();
  if (!conversationId) {
    return jsonError(req, 'conversationId required', 400);
  }

  const conv = await getConversationById(ctx.org.id, conversationId);
  if (!conv) {
    return jsonError(req, 'Conversation not found', 404);
  }

  const { messages } = await listMessages(ctx.org.id, conversationId, { limit: 20 });
  const sb = createServiceClient();
  const { data: settings } = await sb
    .from('social_inbox_settings')
    .select('ai_system_prompt')
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  try {
    const result = await suggestInboxReply({
      orgId: ctx.org.id,
      platform: conv.platform,
      conversationType: conv.conversation_type,
      participantName: conv.participant_name,
      propertyId: (conv.property_id as string | null) ?? null,
      inquiryCheckIn: (conv.inquiry_check_in as string | null) ?? null,
      inquiryCheckOut: (conv.inquiry_check_out as string | null) ?? null,
      messages: messages.map((m) => ({
        direction: m.direction,
        body: m.body_text,
        sentAt: m.sent_at,
      })),
      systemPromptOverride: (settings?.ai_system_prompt as string | null) ?? null,
    });
    return jsonSuccess(req, {
      suggestion: result.suggestion,
      flagged: result.flagged,
    });
  } catch (e) {
    return jsonError(req, (e as Error).message, 503);
  }
});
