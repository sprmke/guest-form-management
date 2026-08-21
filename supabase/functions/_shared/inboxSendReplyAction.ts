/**
 * Shared "send a plain-text reply" action for the AI dashboard assistant's
 * `propose_send_inbox_reply` tool — a deliberately narrower slice of `social-inbox-send`'s
 * capability (text + conversationId only, no attachments/replyToMessageId) since
 * this is the assistant's first externally-visible, real-guest-facing send action. The full
 * `social-inbox-send` edge function keeps its own richer inline implementation — not refactored
 * to share this module, since its feature set is intentionally broader than what a chat tool
 * should attempt to fill from free text.
 */

import {
  isWithinHumanAgentWindowFromInbound,
  isWithinMessagingWindowFromInbound,
} from './socialInboxAiService.ts';
import { friendlyMetaSendError } from './metaInboxSendErrors.ts';
import { getPageAccessToken, sendMetaMessage } from './metaInboxGraph.ts';
import { createServiceClient } from './orgAuth.ts';
import {
  conversationAllowedInScope,
  getConversationById,
  insertMessageIfNew,
  updateConversationAfterMessage,
} from './socialInboxService.ts';
import { maybeNotifyGuestOfHostWebReply } from './guestChatEmail.ts';
import { buildMessagePreview } from './guestChatAttachments.ts';
import type { SocialChannelConnectionRow, SocialConversationRow } from './socialInboxTypes.ts';
import type { InboxAccessContext } from './inboxAccess.ts';

export class InboxSendReplyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Loads + scope-checks the target conversation; throws InboxSendReplyError (404-equivalent) if out of scope. */
export async function loadInboxConversationInScope(
  ctx: InboxAccessContext,
  conversationId: string,
  metaIds: Set<string>
): Promise<SocialConversationRow> {
  const conv = await getConversationById(ctx.orgId, conversationId);
  if (!conv) throw new InboxSendReplyError('Conversation not found', 404);
  if (
    !conversationAllowedInScope(conv, {
      propertyId: ctx.propertyId,
      parkingId: ctx.parkingId,
      metaIds,
    })
  ) {
    throw new InboxSendReplyError('Conversation not found', 404);
  }
  return conv;
}

/** Sends a plain-text reply — web insert+notify, or Meta DM via the Graph API. */
export async function sendInboxTextReply(
  ctx: InboxAccessContext,
  conv: SocialConversationRow,
  userId: string,
  text: string,
  opts: { useHumanAgentTag?: boolean } = {}
): Promise<{ sent: true }> {
  const trimmed = text.trim();
  if (!trimmed) throw new InboxSendReplyError('text is required');

  const now = new Date().toISOString();

  if (conv.platform === 'web') {
    const externalId = `web:${crypto.randomUUID()}`;
    const preview = buildMessagePreview(trimmed, []);
    await insertMessageIfNew({
      organization_id: ctx.org.id,
      conversation_id: conv.id,
      direction: 'outbound',
      external_message_id: externalId,
      body_text: trimmed,
      attachments: [],
      sent_at: now,
      delivery_status: 'sent',
      sent_by_user_id: userId,
      is_ai_generated: false,
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
    }).catch((err) => console.warn('[inboxSendReplyAction] guest notify:', err));
    return { sent: true };
  }

  const sb = createServiceClient();
  const { data: conn } = await sb
    .from('social_channel_connections')
    .select('*')
    .eq('id', conv.connection_id)
    .maybeSingle();
  if (conn?.status !== 'connected') {
    throw new InboxSendReplyError('This channel is disconnected — reconnect Meta to reply');
  }
  if (!conn?.encrypted_access_token || !conn.meta_page_id) {
    throw new InboxSendReplyError('Channel not connected');
  }
  const connection = conn as SocialChannelConnectionRow;
  const token = await getPageAccessToken(connection);

  try {
    if (conv.conversation_type === 'dm') {
      const withinStandardWindow = isWithinMessagingWindowFromInbound(conv.last_inbound_at);
      const withinHumanAgentWindow = isWithinHumanAgentWindowFromInbound(conv.last_inbound_at);
      if (!withinStandardWindow && !(opts.useHumanAgentTag === true && withinHumanAgentWindow)) {
        throw new InboxSendReplyError('Reply window closed — guest must message again');
      }
      const result = await sendMetaMessage({
        pageId: connection.meta_page_id,
        pageAccessToken: token,
        recipientId: conv.external_participant_id ?? '',
        text: trimmed,
        platform: conv.platform,
        tag: !withinStandardWindow && opts.useHumanAgentTag === true ? 'HUMAN_AGENT' : undefined,
      });
      await insertMessageIfNew({
        organization_id: ctx.org.id,
        conversation_id: conv.id,
        direction: 'outbound',
        external_message_id: result.message_id,
        body_text: trimmed,
        attachments: [],
        sent_at: now,
        delivery_status: 'sent',
        message_tag: !withinStandardWindow && opts.useHumanAgentTag === true ? 'human_agent' : null,
        sent_by_user_id: userId,
        is_ai_generated: false,
      });
    } else {
      throw new InboxSendReplyError('This conversation type is no longer supported');
    }
  } catch (err) {
    if (err instanceof InboxSendReplyError) throw err;
    throw new InboxSendReplyError(
      friendlyMetaSendError(err instanceof Error ? err.message : String(err)),
      502
    );
  }

  await updateConversationAfterMessage(conv.id, {
    subject_preview: trimmed.slice(0, 500),
    last_message_at: now,
    reply_status: 'replied',
    unread_delta: 0,
  });

  return { sent: true };
}
