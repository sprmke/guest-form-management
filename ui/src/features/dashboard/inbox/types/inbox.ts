export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'airbnb' | 'web';
export type ConversationType = 'dm' | 'comment';
export type ReplyStatus = 'pending' | 'replied' | 'none';

export type InboxConnection = {
  id: string;
  platform: SocialPlatform;
  displayName: string | null;
  profileImageUrl: string | null;
  status: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
  webhookSubscribed?: boolean;
  errorMessage: string | null;
  /** Mock preview only — not a live API connection */
  isPreview?: boolean;
};

export type InboxConversation = {
  id: string;
  organization_id: string;
  connection_id: string;
  platform: SocialPlatform;
  conversation_type: ConversationType;
  external_thread_id: string;
  external_participant_id: string | null;
  participant_name: string | null;
  participant_avatar_url: string | null;
  subject_preview: string | null;
  last_message_at: string;
  last_inbound_at: string | null;
  unread_count: number;
  reply_status: ReplyStatus;
  messaging_window_expires_at: string | null;
  linked_post_id: string | null;
  linked_post_url: string | null;
  property_id?: string | null;
  guest_user_id?: string | null;
  inquiry_check_in?: string | null;
  inquiry_check_out?: string | null;
  property_name?: string | null;
  property_slug?: string | null;
};

export type InboxMessage = {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body_text: string | null;
  attachments: unknown[];
  sent_at: string;
  delivery_status: string | null;
  is_ai_generated: boolean;
};

export type InboxTemplate = {
  id: string;
  title: string;
  body_text: string;
  platform: SocialPlatform | null;
  conversation_type: ConversationType | 'all';
  sort_order: number;
  is_active: boolean;
};

export type SaveInboxTemplatePayload = {
  id?: string;
  title: string;
  bodyText: string;
  platform?: SocialPlatform | null;
};

export type InboxTab = 'messages' | 'channels' | 'quick-replies' | 'automation';

export type ThreadStatusFilter = 'all' | 'unread' | 'pending' | 'replied';
export type ThreadTypeFilter = 'all' | 'dm' | 'comment';
export type ThreadPlatformFilter = 'all' | SocialPlatform;

export type InboxAutomationSettings = {
  autoReplyEnabled: boolean;
  autoReplyMode: 'draft' | 'send';
  aiSystemPrompt: string;
  platformToggles: Record<string, boolean>;
  aiAvailable?: boolean;
  aiError?: string | null;
};

export type MetaPagePickerOption = {
  id: string;
  name: string;
  profileImageUrl: string | null;
  hasInstagram: boolean;
};

export type ComingSoonPlatform = {
  platform: SocialPlatform;
  available: false;
  reason: string;
};
