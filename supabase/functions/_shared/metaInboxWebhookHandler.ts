/**
 * Process Meta webhook payloads into social_conversations / social_messages.
 */

import { metaMessagingWindowExpiry, normalizeMetaWebhookTimestamp } from './metaTimestamp.ts';
import { fetchMetaMessengerParticipantProfile, getPageAccessToken } from './metaInboxGraph.ts';
import { createNotification } from './notificationService.ts';
import {
  buildDmThreadId,
  getConnectionByMetaPageId,
  getConversationByExternalThread,
  insertMessageIfNew,
  migrateLegacyDmThreadId,
  recordWebhookEvent,
  updateConversationAfterMessage,
  upsertConversation,
} from './socialInboxService.ts';
import type { SocialPlatform } from './socialInboxTypes.ts';

type MetaMessagingEvent = {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: unknown[];
    is_echo?: boolean;
  };
};

export async function handleMetaMessagingWebhook(
  pageId: string,
  event: MetaMessagingEvent,
  platform: SocialPlatform
): Promise<void> {
  const eventId = event.message?.mid;
  if (!eventId) return;
  if (!(await recordWebhookEvent(eventId))) return;

  const connection = await getConnectionByMetaPageId(pageId);
  if (!connection?.encrypted_access_token) return;

  const orgId = connection.organization_id;
  const isEcho = event.message?.is_echo === true;
  const senderId = event.sender?.id ?? '';
  const isFromPage = isEcho || senderId === pageId;
  const guestId = isFromPage ? event.recipient?.id : senderId;
  const sentAt = event.timestamp
    ? normalizeMetaWebhookTimestamp(event.timestamp)
    : new Date().toISOString();
  const text = event.message?.text?.trim() ?? '';
  const preview = text || '(attachment)';

  const threadId = buildDmThreadId(platform, guestId ?? 'unknown');
  if (guestId) {
    await migrateLegacyDmThreadId(orgId, platform, guestId, threadId);
  }

  const existing = await getConversationByExternalThread(orgId, platform, threadId);
  const identityPatch: {
    participant_name?: string;
    participant_avatar_url?: string;
  } = {};
  if (!existing?.participant_name?.trim() && guestId && guestId !== 'unknown') {
    try {
      const token = await getPageAccessToken(connection);
      const profile = await fetchMetaMessengerParticipantProfile(guestId, token);
      if (profile.name) identityPatch.participant_name = profile.name;
      if (profile.profilePic) identityPatch.participant_avatar_url = profile.profilePic;
    } catch (e) {
      console.warn('[handleMetaMessagingWebhook] profile lookup:', (e as Error).message);
    }
  }

  const conv = await upsertConversation({
    organization_id: orgId,
    connection_id: connection.id,
    platform,
    external_thread_id: threadId,
    conversation_type: 'dm',
    external_participant_id: guestId ?? null,
    subject_preview: preview.slice(0, 500),
    last_message_at: sentAt,
    last_inbound_at: isFromPage ? undefined : sentAt,
    unread_count: 0,
    reply_status: isFromPage ? 'replied' : 'pending',
    messaging_window_expires_at: isFromPage ? undefined : metaMessagingWindowExpiry(sentAt),
    ...identityPatch,
  });

  await insertMessageIfNew({
    organization_id: orgId,
    conversation_id: conv.id,
    direction: isFromPage ? 'outbound' : 'inbound',
    external_message_id: eventId,
    body_text: text || null,
    attachments: (event.message?.attachments as unknown[]) ?? [],
    sent_at: sentAt,
    delivery_status: null,
    sent_by_user_id: null,
    is_ai_generated: false,
  });

  await updateConversationAfterMessage(conv.id, {
    subject_preview: preview.slice(0, 500),
    last_message_at: sentAt,
    last_inbound_at: isFromPage ? undefined : sentAt,
    unread_delta: isFromPage ? 0 : 1,
    reply_status: isFromPage ? 'replied' : 'pending',
    messaging_window_expires_at: isFromPage ? undefined : metaMessagingWindowExpiry(sentAt),
  });

  if (!isFromPage) {
    try {
      const { notifyTelegramChatInbound } = await import('./telegramChat.ts');
      await notifyTelegramChatInbound({
        conversation: conv,
        text: text || null,
        attachments: [],
        sentAt,
      });
    } catch (e) {
      console.warn('[handleMetaMessagingWebhook] telegram notify:', e);
    }
    try {
      await createNotification({
        organizationId: orgId,
        propertyId: conv.property_id ?? null,
        parkingId: conv.parking_id ?? null,
        type: 'inbox_new_message',
        title: 'New guest message',
        body: preview.slice(0, 200),
        conversationId: conv.id,
        dedupeKey: `${eventId}:inbox_new_message`,
      });
    } catch (e) {
      console.warn('[handleMetaMessagingWebhook] notification create:', e);
    }
  }
}

type MetaFeedChange = {
  field?: string;
  value?: {
    item?: string;
    comment_id?: string;
    post_id?: string;
    parent_id?: string;
    message?: string;
    from?: { id: string; name?: string };
    created_time?: number;
    verb?: string;
  };
};

export async function handleMetaFeedWebhook(pageId: string, change: MetaFeedChange): Promise<void> {
  const value = change.value;
  if (!value || value.item !== 'comment' || value.verb === 'remove') return;
  const commentId = value.comment_id;
  if (!commentId) return;

  const dedupeId = `comment:${commentId}`;
  if (!(await recordWebhookEvent(dedupeId))) return;

  const connection = await getConnectionByMetaPageId(pageId);
  if (!connection) return;

  const orgId = connection.organization_id;
  const sentAt = value.created_time
    ? new Date(value.created_time * 1000).toISOString()
    : new Date().toISOString();
  const text = value.message?.trim() ?? '';
  const threadId = `comment:${commentId}`;

  const conv = await upsertConversation({
    organization_id: orgId,
    connection_id: connection.id,
    platform: 'facebook',
    external_thread_id: threadId,
    conversation_type: 'comment',
    external_participant_id: value.from?.id ?? null,
    participant_name: value.from?.name ?? null,
    subject_preview: text.slice(0, 500) || '(comment)',
    last_message_at: sentAt,
    last_inbound_at: sentAt,
    unread_count: 0,
    reply_status: 'pending',
    linked_post_id: value.post_id ?? null,
    linked_post_url: value.post_id ? `https://facebook.com/${value.post_id}` : null,
  });

  await insertMessageIfNew({
    organization_id: orgId,
    conversation_id: conv.id,
    direction: 'inbound',
    external_message_id: dedupeId,
    body_text: text || null,
    attachments: [],
    sent_at: sentAt,
    delivery_status: null,
    sent_by_user_id: null,
    is_ai_generated: false,
  });

  await updateConversationAfterMessage(conv.id, {
    subject_preview: text.slice(0, 500) || '(comment)',
    last_message_at: sentAt,
    last_inbound_at: sentAt,
    unread_delta: 1,
    reply_status: 'pending',
  });
}

type MetaIgCommentChange = {
  field?: string;
  value?: {
    id?: string;
    text?: string;
    media?: { id?: string; media_product_type?: string };
    from?: { id: string; username?: string };
  };
};

export async function handleMetaIgCommentWebhook(
  igUserId: string,
  change: MetaIgCommentChange
): Promise<void> {
  const value = change.value;
  const commentId = value?.id;
  if (!commentId) return;

  const dedupeId = `ig-comment:${commentId}`;
  if (!(await recordWebhookEvent(dedupeId))) return;

  const sb = (await import('./socialInboxService.ts')).socialInboxDb();
  const { data: igConn } = await sb
    .from('social_channel_connections')
    .select('*')
    .eq('meta_ig_user_id', igUserId)
    .eq('platform', 'instagram')
    .eq('status', 'connected')
    .maybeSingle();
  if (!igConn) return;

  const orgId = igConn.organization_id as string;
  const sentAt = new Date().toISOString();
  const text = value?.text?.trim() ?? '';
  const threadId = `comment:${commentId}`;
  const mediaId = value?.media?.id;

  const conv = await upsertConversation({
    organization_id: orgId,
    connection_id: igConn.id as string,
    platform: 'instagram',
    external_thread_id: threadId,
    conversation_type: 'comment',
    external_participant_id: value?.from?.id ?? null,
    participant_name: value?.from?.username ? `@${value.from.username}` : null,
    subject_preview: text.slice(0, 500) || '(comment)',
    last_message_at: sentAt,
    last_inbound_at: sentAt,
    unread_count: 0,
    reply_status: 'pending',
    linked_post_id: mediaId ?? null,
    linked_post_url: mediaId ? `https://instagram.com/p/${mediaId}` : null,
  });

  await insertMessageIfNew({
    organization_id: orgId,
    conversation_id: conv.id,
    direction: 'inbound',
    external_message_id: dedupeId,
    body_text: text || null,
    attachments: [],
    sent_at: sentAt,
    delivery_status: null,
    sent_by_user_id: null,
    is_ai_generated: false,
  });

  await updateConversationAfterMessage(conv.id, {
    subject_preview: text.slice(0, 500) || '(comment)',
    last_message_at: sentAt,
    last_inbound_at: sentAt,
    unread_delta: 1,
    reply_status: 'pending',
  });
}

export async function handleMetaReadReceipt(
  pageId: string,
  senderId: string,
  platform: SocialPlatform
): Promise<void> {
  const connection = await getConnectionByMetaPageId(pageId);
  if (!connection) return;
  const threadId = buildDmThreadId(platform, senderId);
  const sb = (await import('./socialInboxService.ts')).socialInboxDb();
  await sb
    .from('social_conversations')
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq('organization_id', connection.organization_id)
    .eq('external_thread_id', threadId);
}
