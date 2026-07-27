/**
 * Paginated messages for one conversation; mark read; edit host messages.
 */

import {
  assertHostCanEditMessage,
  assertHostCanUnsendMessage,
  editMessageBody,
  softDeleteMessage,
} from '../_shared/chatMessageLifecycle.ts';
import {
  enrichConversationMessageAttachments,
  getConversationById,
  listMessages,
  markConversationRead,
} from '../_shared/socialInboxService.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
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
    const body = await readJsonBody(req).catch(() => ({}) as Record<string, unknown>);
    const action = String(body.action ?? '').trim();

    if (action === 'unsend') {
      const replyCtx = await resolveOrgAccessContext(req, 'org:inbox:reply');
      const messageId = String(body.messageId ?? body.message_id ?? '').trim();
      if (!messageId) {
        return jsonError(req, 'messageId required', 400);
      }
      try {
        await assertHostCanUnsendMessage(replyCtx.org.id, conversationId, messageId);
        await softDeleteMessage(messageId, { conversationId });
        return jsonSuccess(req, { unsent: true });
      } catch (e) {
        const message = (e as Error).message;
        if (message === 'Conversation not found' || message === 'Message not found') {
          return jsonError(req, message, 404);
        }
        if (
          message === 'Cannot edit this message' ||
          message === 'Message already read' ||
          message === 'Guest already replied'
        ) {
          return jsonError(req, message, 400);
        }
        throw e;
      }
    }

    await markConversationRead(ctx.org.id, conversationId);
    return jsonSuccess(req, { read: true });
  }

  if (req.method === 'PATCH') {
    const replyCtx = await resolveOrgAccessContext(req, 'org:inbox:reply');
    const body = await readJsonBody(req);
    const messageId = String(body.messageId ?? body.message_id ?? '').trim();
    const text = String(body.text ?? '').trim();
    if (!messageId || !text) {
      return jsonError(req, 'messageId and text required', 400);
    }
    try {
      await assertHostCanEditMessage(replyCtx.org.id, conversationId, messageId);
      const message = await editMessageBody(messageId, text, {
        refreshPreview: true,
        conversationId,
      });
      return jsonSuccess(req, { message });
    } catch (e) {
      const message = (e as Error).message;
      if (message === 'Conversation not found' || message === 'Message not found') {
        return jsonError(req, message, 404);
      }
      if (
        message === 'Cannot edit this message' ||
        message === 'Message already read' ||
        message === 'Guest already replied' ||
        message === 'Message text required'
      ) {
        return jsonError(req, message, 400);
      }
      throw e;
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
