/**
 * guest-web-chat-messages — List or send messages in a guest web chat thread.
 * Auth: signed-in guest who owns the thread.
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { listGuestWebMessages, sendGuestWebMessage } from '../_shared/webGuestChatService.ts';

serveAuthenticated('guest-web-chat-messages', async (req, user) => {
  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversation_id')?.trim();

  if (req.method === 'GET') {
    const id = conversationId ?? url.searchParams.get('conversationId')?.trim();
    if (!id) {
      return jsonError(req, 'conversation_id required', 400);
    }
    const before = url.searchParams.get('before') ?? undefined;
    try {
      const result = await listGuestWebMessages(user, id, { before });
      return jsonSuccess(req, result);
    } catch (e) {
      const message = (e as Error).message;
      if (message === 'Conversation not found') {
        return jsonError(req, message, 404);
      }
      throw e;
    }
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const id = String(body.conversationId ?? body.conversation_id ?? conversationId ?? '').trim();
    const text = String(body.text ?? '').trim();
    if (!id || !text) {
      return jsonError(req, 'conversationId and text required', 400);
    }
    try {
      await sendGuestWebMessage(user, id, text);
      return jsonSuccess(req, { sent: true });
    } catch (e) {
      const message = (e as Error).message;
      if (message === 'Conversation not found') {
        return jsonError(req, message, 404);
      }
      if (message === 'Message text required') {
        return jsonError(req, message, 400);
      }
      throw e;
    }
  }

  return jsonError(req, 'Method not allowed', 405);
});
