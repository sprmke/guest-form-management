/**
 * Optional AI auto-send after inbound guest web chat messages.
 */

import { suggestInboxReply } from './socialInboxAiService.ts';
import {
  insertMessageIfNew,
  listMessages,
  socialInboxDb,
  updateConversationAfterMessage,
} from './socialInboxService.ts';
import { maybeNotifyGuestOfHostWebReply } from './guestChatEmail.ts';
import { buildWebMessageExternalId } from './webGuestChatIds.ts';

const AUTO_REPLY_COOLDOWN_MS = 90_000;

async function loadWebPropertyContext(propertyId: string | null): Promise<{
  propertyName: string | null;
  inquiryCheckIn: string | null;
  inquiryCheckOut: string | null;
}> {
  if (!propertyId) {
    return { propertyName: null, inquiryCheckIn: null, inquiryCheckOut: null };
  }
  const sb = socialInboxDb();
  const { data } = await sb.from('properties').select('name').eq('id', propertyId).maybeSingle();
  return {
    propertyName: (data?.name as string | undefined) ?? null,
    inquiryCheckIn: null,
    inquiryCheckOut: null,
  };
}

export async function maybeAutoReplyToWebInbound(
  orgId: string,
  conversationId: string,
  inboundExternalMessageId: string
): Promise<void> {
  const sb = socialInboxDb();
  const { data: settings } = await sb
    .from('social_inbox_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();
  if (!settings?.auto_reply_enabled || settings.auto_reply_mode !== 'send') return;

  const toggles = (settings.platform_toggles ?? {}) as Record<string, boolean>;
  if (toggles.web === false) return;

  const { data: conv } = await sb
    .from('social_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('organization_id', orgId)
    .eq('platform', 'web')
    .maybeSingle();
  if (!conv || conv.conversation_type !== 'dm') return;

  const { data: inboundRow } = await sb
    .from('social_messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('external_message_id', inboundExternalMessageId)
    .eq('direction', 'inbound')
    .maybeSingle();
  if (!inboundRow) return;

  const { messages } = await listMessages(orgId, conversationId, { limit: 20 });

  const recentAutoReply = [...messages]
    .reverse()
    .find(
      (m) =>
        m.direction === 'outbound' &&
        m.is_ai_generated &&
        Date.now() - new Date(m.sent_at).getTime() < AUTO_REPLY_COOLDOWN_MS
    );
  if (recentAutoReply) {
    const autoIdx = messages.findIndex((m) => m.id === recentAutoReply.id);
    const inboundAfterAuto = messages.slice(autoIdx + 1).some((m) => m.direction === 'inbound');
    if (!inboundAfterAuto) return;
  }

  const propertyCtx = await loadWebPropertyContext(conv.property_id as string | null);

  const { suggestion: draft } = await suggestInboxReply({
    orgId,
    platform: 'web',
    conversationType: conv.conversation_type,
    participantName: conv.participant_name,
    propertyId: conv.property_id as string | null,
    propertyName: propertyCtx.propertyName,
    inquiryCheckIn: (conv.inquiry_check_in as string | null) ?? null,
    inquiryCheckOut: (conv.inquiry_check_out as string | null) ?? null,
    messages: messages.map((m) => ({
      direction: m.direction,
      body: m.body_text,
      sentAt: m.sent_at,
    })),
    systemPromptOverride: settings.ai_system_prompt as string | null,
  });

  const now = new Date().toISOString();
  const externalId = buildWebMessageExternalId();
  await insertMessageIfNew({
    organization_id: orgId,
    conversation_id: conversationId,
    direction: 'outbound',
    external_message_id: externalId,
    body_text: draft,
    attachments: [],
    sent_at: now,
    delivery_status: 'sent',
    sent_by_user_id: null,
    is_ai_generated: true,
  });
  await updateConversationAfterMessage(conversationId, {
    subject_preview: draft.slice(0, 500),
    last_message_at: now,
    reply_status: 'replied',
    guest_unread_delta: 1,
  });
  void maybeNotifyGuestOfHostWebReply({
    orgId,
    conversationId,
    externalMessageId: externalId,
  }).catch((err) => console.warn('[webInboxAutoReply] guest notify:', err));
}
