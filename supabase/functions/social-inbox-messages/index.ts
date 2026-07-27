/**
 * Paginated messages for one conversation.
 */

import {
  enrichConversationMessageAttachments,
  getConversationById,
  listMessages,
  markConversationRead,
} from '../_shared/socialInboxService.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('social-inbox-messages', async (req) => {
  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversation_id')?.trim();
  if (!conversationId) {
    return jsonError(req, 'conversation_id required', 400);
  }

  const ctx = await resolveOrgAccessContext(req, 'org:inbox:view');
  const conv = await getConversationById(ctx.org.id, conversationId);
  if (!conv) {
    return jsonError(req, 'Conversation not found', 404);
  }

  if (req.method === 'GET') {
    const before = url.searchParams.get('before') ?? undefined;
    const { messages, hasMore } = await listMessages(ctx.org.id, conversationId, { before });
    const enriched = await enrichConversationMessageAttachments(conv, messages);
    return jsonSuccess(req, { conversation: conv, messages: enriched, hasMore });
  }

  if (req.method === 'POST') {
    await markConversationRead(ctx.org.id, conversationId);
    return jsonSuccess(req, { read: true });
  }

  return jsonError(req, 'Method not allowed', 405);
});
