/**
 * Optional AI auto-send after inbound Meta DM webhooks.
 */

import { getPageAccessToken, sendMetaMessage } from './metaInboxGraph.ts';
import { isFeatureEnabled } from './planFeatures.ts';
import { orgHasPropertyWithFeature, resolvePropertyEntitlements } from './planEntitlements.ts';
import { isWithinMessagingWindowFromInbound, suggestInboxReply } from './socialInboxAiService.ts';
import {
  getConversationByExternalThread,
  insertMessageIfNew,
  listMessages,
  socialInboxDb,
  updateConversationAfterMessage,
} from './socialInboxService.ts';
import type { SocialPlatform } from './socialInboxTypes.ts';

const AUTO_REPLY_COOLDOWN_MS = 90_000;

export async function maybeAutoReplyToInboundDm(
  orgId: string,
  threadId: string,
  platform: Extract<SocialPlatform, 'facebook' | 'instagram'>,
  inboundExternalMessageId: string
): Promise<void> {
  const sb = socialInboxDb();
  const { data: settings } = await sb
    .from('social_inbox_settings')
    .select('*')
    .eq('organization_id', orgId)
    .is('parking_id', null)
    .maybeSingle();
  if (!settings?.auto_reply_enabled || settings.auto_reply_mode !== 'send') return;

  const toggles = (settings.platform_toggles ?? {}) as Record<string, boolean>;
  if (toggles[platform] === false) return;

  const conv = await getConversationByExternalThread(orgId, platform, threadId);
  if (!conv || conv.conversation_type !== 'dm') return;
  if (!isWithinMessagingWindowFromInbound(conv.last_inbound_at)) return;

  const propertyId = (conv.property_id as string | null) ?? null;
  if (propertyId) {
    const entitlements = await resolvePropertyEntitlements(propertyId);
    if (!isFeatureEnabled(entitlements, 'aiChatAutoReply')) return;
  } else {
    const allowed = await orgHasPropertyWithFeature(orgId, 'aiChatAutoReply');
    if (!allowed) return;
  }

  const { messages } = await listMessages(orgId, conv.id, { limit: 20 });
  const latest = messages[messages.length - 1];
  if (!latest || latest.external_message_id !== inboundExternalMessageId) return;

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

  const { data: connRow } = await sb
    .from('social_channel_connections')
    .select('*')
    .eq('id', conv.connection_id)
    .maybeSingle();
  if (!connRow?.meta_page_id || !connRow.encrypted_access_token) return;

  const { suggestion: draft } = await suggestInboxReply({
    orgId,
    platform,
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
    systemPromptOverride: settings.ai_system_prompt as string | null,
  });

  const token = await getPageAccessToken(connRow as never);
  const result = await sendMetaMessage({
    pageId: connRow.meta_page_id as string,
    pageAccessToken: token,
    recipientId: conv.external_participant_id ?? '',
    text: draft,
    platform,
  });

  const now = new Date().toISOString();
  await insertMessageIfNew({
    organization_id: orgId,
    conversation_id: conv.id,
    direction: 'outbound',
    external_message_id: result.message_id,
    body_text: draft,
    attachments: [],
    sent_at: now,
    delivery_status: 'sent',
    sent_by_user_id: null,
    is_ai_generated: true,
  });
  await updateConversationAfterMessage(conv.id, {
    subject_preview: draft.slice(0, 500),
    last_message_at: now,
    reply_status: 'replied',
  });
}
