/**
 * dashboard-assistant-conversations — GET the signed-in user's own AI assistant conversation
 * history (list) or a single conversation's messages (?conversation_id=). DELETE a conversation
 * the caller owns (?conversation_id=). Conversations are private per user
 * (docs/workflow/planned/ai-dashboard-assistant.md §4) — never another user's.
 */

import { removeConversationAttachments } from '../_shared/dashboardAssistantAttachments.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  readOrgIdFromUrl,
  readOrgSlugFromUrl,
  resolveOrgAccessContext,
} from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('dashboard-assistant-conversations', async (req, user) => {
  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversation_id')?.trim();
  const sb = createServiceClient();

  if (req.method === 'DELETE') {
    if (!conversationId) {
      return jsonError(req, 'conversation_id is required', 400);
    }

    const { data: conversation, error } = await sb
      .from('ai_dashboard_assistant_conversations')
      .select('id, user_id, organization_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (error || !conversation || conversation.user_id !== user.id) {
      return jsonError(req, 'Conversation not found', 404);
    }

    try {
      await removeConversationAttachments({
        organizationId: conversation.organization_id,
        userId: user.id,
        conversationId,
      });
    } catch {
      // Storage cleanup is best-effort; messages cascade with the conversation row.
    }

    const { error: deleteError } = await sb
      .from('ai_dashboard_assistant_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);
    if (deleteError) {
      return jsonError(req, `Failed to delete conversation: ${deleteError.message}`, 500);
    }

    return jsonSuccess(req, { deleted: true });
  }

  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  if (conversationId) {
    const { data: conversation, error } = await sb
      .from('ai_dashboard_assistant_conversations')
      .select('id, user_id, title, property_id, last_message_at, created_at')
      .eq('id', conversationId)
      .maybeSingle();
    if (error || !conversation || conversation.user_id !== user.id) {
      return jsonError(req, 'Conversation not found', 404);
    }

    const { data: messages, error: messagesError } = await sb
      .from('ai_dashboard_assistant_messages')
      .select('id, role, content_text, blocks, attachments, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (messagesError) {
      return jsonError(req, `Failed to load messages: ${messagesError.message}`, 500);
    }

    return jsonSuccess(req, { conversation, messages: messages ?? [] });
  }

  const orgSlug = readOrgSlugFromUrl(url);
  const orgId = readOrgIdFromUrl(url);
  if (!orgSlug && !orgId) {
    return jsonError(req, 'org_id or org_slug is required', 400);
  }
  const ctx = await resolveOrgAccessContext(req);

  const { data: conversations, error } = await sb
    .from('ai_dashboard_assistant_conversations')
    .select('id, title, property_id, last_message_at, created_at')
    .eq('organization_id', ctx.org.id)
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false })
    .limit(20);
  if (error) {
    return jsonError(req, `Failed to load conversations: ${error.message}`, 500);
  }

  return jsonSuccess(req, { conversations: conversations ?? [] });
});
