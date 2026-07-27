/**
 * Send a reply to a conversation (DM or public comment).
 */

import { isWithinMessagingWindowFromInbound } from '../_shared/socialInboxAiService.ts';
import { friendlyMetaSendError } from '../_shared/metaInboxSendErrors.ts';
import {
  getPageAccessToken,
  replyMetaPublicComment,
  sendMetaMessage,
} from '../_shared/metaInboxGraph.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  getConversationById,
  insertMessageIfNew,
  updateConversationAfterMessage,
} from '../_shared/socialInboxService.ts';
import { resolveMetaReplyTarget, resolveReplyTarget } from '../_shared/chatMessageLifecycle.ts';
import { maybeNotifyGuestOfHostWebReply } from '../_shared/guestChatEmail.ts';
import {
  assertGuestWebMessagePayload,
  buildMessagePreview,
  parseGuestWebChatAttachments,
} from '../_shared/guestChatAttachments.ts';
import type { SocialChannelConnectionRow } from '../_shared/socialInboxTypes.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('social-inbox-send', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const ctx = await resolveOrgAccessContext(req, 'org:inbox:reply');
  const body = await readJsonBody(req);
  const conversationId = String(body.conversationId ?? '').trim();
  const text = String(body.text ?? '').trim();
  const privateReply = body.privateReply === true;
  const replyToMessageId = String(body.replyToMessageId ?? body.reply_to_message_id ?? '').trim();
  const attachments = parseGuestWebChatAttachments(body.attachments);

  if (!conversationId) {
    return jsonError(req, 'conversationId required', 400);
  }

  const conv = await getConversationById(ctx.org.id, conversationId);
  if (!conv) {
    return jsonError(req, 'Conversation not found', 404);
  }

  const now = new Date().toISOString();

  if (conv.platform === 'web') {
    try {
      assertGuestWebMessagePayload(text, attachments);
    } catch (e) {
      return jsonError(req, (e as Error).message, 400);
    }

    const externalId = `web:${crypto.randomUUID()}`;
    const preview = buildMessagePreview(text, attachments);
    let replyFields: { reply_to_message_id?: string; reply_preview_text?: string } = {};
    if (replyToMessageId) {
      replyFields = await resolveReplyTarget(conv.id, replyToMessageId);
    }
    await insertMessageIfNew({
      organization_id: ctx.org.id,
      conversation_id: conv.id,
      direction: 'outbound',
      external_message_id: externalId,
      body_text: text || null,
      attachments,
      sent_at: now,
      delivery_status: 'sent',
      sent_by_user_id: user.id,
      is_ai_generated: false,
      ...replyFields,
    });
    await updateConversationAfterMessage(conv.id, {
      subject_preview: preview,
      last_message_at: now,
      reply_status: 'replied',
      unread_delta: 0,
      guest_unread_delta: 1,
    });
    void maybeNotifyGuestOfHostWebReply({
      orgId: ctx.org.id,
      conversationId: conv.id,
      externalMessageId: externalId,
    }).catch((err) => console.warn('[social-inbox-send] guest notify:', err));
    return jsonSuccess(req, { sent: true });
  }

  if (!text) {
    return jsonError(req, 'conversationId and text required', 400);
  }

  const sb = createServiceClient();
  const { data: conn } = await sb
    .from('social_channel_connections')
    .select('*')
    .eq('id', conv.connection_id)
    .maybeSingle();
  if (!conn?.encrypted_access_token || !conn.meta_page_id) {
    return jsonError(req, 'Channel not connected', 400);
  }

  const connection = conn as SocialChannelConnectionRow;
  const token = await getPageAccessToken(connection);

  try {
    if (conv.conversation_type === 'dm') {
      if (!isWithinMessagingWindowFromInbound(conv.last_inbound_at)) {
        return jsonError(req, 'Reply window closed — guest must message again', 400);
      }

      let replyFields: { reply_to_message_id?: string; reply_preview_text?: string } = {};
      let replyToMid: string | undefined;
      if (replyToMessageId) {
        const resolved = await resolveMetaReplyTarget(conv.id, replyToMessageId);
        replyFields = {
          reply_to_message_id: resolved.reply_to_message_id,
          reply_preview_text: resolved.reply_preview_text,
        };
        replyToMid = resolved.replyToMid;
      }

      const result = await sendMetaMessage({
        pageId: connection.meta_page_id,
        pageAccessToken: token,
        recipientId: conv.external_participant_id ?? '',
        text,
        platform: conv.platform,
        replyToMid,
      });
      await insertMessageIfNew({
        organization_id: ctx.org.id,
        conversation_id: conv.id,
        direction: 'outbound',
        external_message_id: result.message_id,
        body_text: text,
        attachments: [],
        sent_at: now,
        delivery_status: 'sent',
        sent_by_user_id: user.id,
        is_ai_generated: false,
        ...replyFields,
      });
    } else {
      const commentId = conv.external_thread_id.replace(/^comment:/, '');
      if (privateReply && conv.platform === 'instagram') {
        const result = await sendMetaMessage({
          pageId: connection.meta_page_id,
          pageAccessToken: token,
          recipientId: '',
          text,
          platform: conv.platform,
          commentId,
        });
        await insertMessageIfNew({
          organization_id: ctx.org.id,
          conversation_id: conv.id,
          direction: 'outbound',
          external_message_id: result.message_id,
          body_text: text,
          attachments: [],
          sent_at: now,
          delivery_status: 'sent',
          sent_by_user_id: user.id,
          is_ai_generated: false,
        });
      } else {
        const result = await replyMetaPublicComment({
          commentId,
          pageAccessToken: token,
          text,
          platform: conv.platform,
        });
        await insertMessageIfNew({
          organization_id: ctx.org.id,
          conversation_id: conv.id,
          direction: 'outbound',
          external_message_id: result.id,
          body_text: text,
          attachments: [],
          sent_at: now,
          delivery_status: 'sent',
          sent_by_user_id: user.id,
          is_ai_generated: false,
        });
      }
    }
  } catch (e) {
    return jsonError(req, friendlyMetaSendError((e as Error).message), 502);
  }

  await updateConversationAfterMessage(conv.id, {
    subject_preview: text.slice(0, 500),
    last_message_at: now,
    reply_status: 'replied',
    unread_delta: 0,
  });

  return jsonSuccess(req, { sent: true });
});
