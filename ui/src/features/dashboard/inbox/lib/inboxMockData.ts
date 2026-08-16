import type {
  ComingSoonPlatform,
  InboxAutomationSettings,
  InboxConnection,
  InboxConversation,
  InboxMessage,
  InboxTemplate,
  ThreadPlatformFilter,
  ThreadStatusFilter,
  ThreadTypeFilter,
} from '@/features/dashboard/inbox/types/inbox';

const ORG = 'mock-org-id';

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

export const MOCK_CONNECTIONS: InboxConnection[] = [
  {
    id: 'conn-fb',
    platform: 'facebook',
    displayName: 'Kame Home Azure North',
    profileImageUrl: null,
    status: 'connected',
    connectedAt: hoursAgo(720),
    lastSyncAt: hoursAgo(1),
    errorMessage: null,
  },
  {
    id: 'conn-ig',
    platform: 'instagram',
    displayName: '@kamehome.ph',
    profileImageUrl: null,
    status: 'connected',
    connectedAt: hoursAgo(720),
    lastSyncAt: hoursAgo(1),
    errorMessage: null,
  },
  {
    id: 'conn-tiktok',
    platform: 'tiktok',
    displayName: '@kamehome.stays',
    profileImageUrl: null,
    status: 'connected',
    connectedAt: hoursAgo(48),
    lastSyncAt: null,
    errorMessage: null,
    isPreview: true,
  },
  {
    id: 'conn-airbnb',
    platform: 'airbnb',
    displayName: 'Kame Home — Azure North',
    profileImageUrl: null,
    status: 'connected',
    connectedAt: hoursAgo(168),
    lastSyncAt: null,
    errorMessage: null,
    isPreview: true,
  },
];

export const MOCK_COMING_SOON: ComingSoonPlatform[] = [];

export const MOCK_CONVERSATIONS: InboxConversation[] = [
  {
    id: 'mock-fb-dm-unread',
    organization_id: ORG,
    connection_id: 'conn-fb',
    platform: 'facebook',
    conversation_type: 'dm',
    external_thread_id: 'fb:guest-maria',
    external_participant_id: 'guest-maria',
    participant_name: 'Maria Santos',
    participant_avatar_url: null,
    subject_preview: 'Hi! Is Azure North free on March 15–17 for 4 guests?',
    last_message_at: minutesAgo(12),
    last_inbound_at: minutesAgo(12),
    unread_count: 2,
    reply_status: 'pending',
    messaging_window_expires_at: hoursFromNow(20),
    linked_post_id: null,
    linked_post_url: null,
  },
  {
    id: 'mock-fb-dm-replied',
    organization_id: ORG,
    connection_id: 'conn-fb',
    platform: 'facebook',
    conversation_type: 'dm',
    external_thread_id: 'fb:guest-james',
    external_participant_id: 'guest-james',
    participant_name: 'James Lim',
    participant_avatar_url: null,
    subject_preview: 'Thank you! See you on check-in day.',
    last_message_at: minutesAgo(180),
    last_inbound_at: minutesAgo(200),
    unread_count: 0,
    reply_status: 'replied',
    messaging_window_expires_at: hoursFromNow(18),
    linked_post_id: null,
    linked_post_url: null,
  },
  {
    id: 'mock-ig-dm-urgent',
    organization_id: ORG,
    connection_id: 'conn-ig',
    platform: 'instagram',
    conversation_type: 'dm',
    external_thread_id: 'ig:guest-ella',
    external_participant_id: 'guest-ella',
    participant_name: '@ella.travels',
    participant_avatar_url: null,
    subject_preview: 'Do you allow small dogs? We have a shih tzu.',
    last_message_at: minutesAgo(5),
    last_inbound_at: minutesAgo(5),
    unread_count: 1,
    reply_status: 'pending',
    messaging_window_expires_at: hoursFromNow(1.5),
    linked_post_id: null,
    linked_post_url: null,
  },
  {
    id: 'mock-ig-dm-expired',
    organization_id: ORG,
    connection_id: 'conn-ig',
    platform: 'instagram',
    conversation_type: 'dm',
    external_thread_id: 'ig:guest-ryan',
    external_participant_id: 'guest-ryan',
    participant_name: 'Ryan Cruz',
    participant_avatar_url: null,
    subject_preview: 'Following up on my inquiry from last week.',
    last_message_at: hoursAgo(30),
    last_inbound_at: hoursAgo(30),
    unread_count: 0,
    reply_status: 'pending',
    messaging_window_expires_at: hoursAgo(6),
    linked_post_id: null,
    linked_post_url: null,
  },
  {
    id: 'mock-fb-comment',
    organization_id: ORG,
    connection_id: 'conn-fb',
    platform: 'facebook',
    conversation_type: 'comment',
    external_thread_id: 'comment:fb-8821',
    external_participant_id: 'fb-user-8821',
    participant_name: 'Patricia Go',
    participant_avatar_url: null,
    subject_preview: 'How much is the nightly rate for 2 pax?',
    last_message_at: minutesAgo(45),
    last_inbound_at: minutesAgo(45),
    unread_count: 1,
    reply_status: 'pending',
    messaging_window_expires_at: null,
    linked_post_id: 'post-azure-promo',
    linked_post_url: 'https://facebook.com/kamehome/posts/azure-promo',
  },
  {
    id: 'mock-ig-comment',
    organization_id: ORG,
    connection_id: 'conn-ig',
    platform: 'instagram',
    conversation_type: 'comment',
    external_thread_id: 'comment:ig-4410',
    external_participant_id: 'ig-user-4410',
    participant_name: '@mark.books',
    participant_avatar_url: null,
    subject_preview: 'Is parking included?',
    last_message_at: minutesAgo(90),
    last_inbound_at: minutesAgo(90),
    unread_count: 1,
    reply_status: 'pending',
    messaging_window_expires_at: null,
    linked_post_id: 'media-reel-tour',
    linked_post_url: 'https://instagram.com/p/reel-tour',
  },
  {
    id: 'mock-tiktok-dm',
    organization_id: ORG,
    connection_id: 'conn-tiktok',
    platform: 'tiktok',
    conversation_type: 'dm',
    external_thread_id: 'tiktok:guest-sophie',
    external_participant_id: 'guest-sophie',
    participant_name: 'Sophie Tan',
    participant_avatar_url: null,
    subject_preview: 'Saw your unit tour — available this weekend?',
    last_message_at: minutesAgo(25),
    last_inbound_at: minutesAgo(25),
    unread_count: 1,
    reply_status: 'pending',
    messaging_window_expires_at: hoursFromNow(40),
    linked_post_id: null,
    linked_post_url: null,
  },
  {
    id: 'mock-airbnb-inquiry',
    organization_id: ORG,
    connection_id: 'conn-airbnb',
    platform: 'airbnb',
    conversation_type: 'dm',
    external_thread_id: 'airbnb:thread-hm8k2',
    external_participant_id: 'airbnb-guest-david',
    participant_name: 'David (Airbnb)',
    participant_avatar_url: null,
    subject_preview: 'Inquiry: Apr 2–5 · 3 guests · asking about early check-in',
    last_message_at: minutesAgo(8),
    last_inbound_at: minutesAgo(8),
    unread_count: 1,
    reply_status: 'pending',
    messaging_window_expires_at: null,
    linked_post_id: null,
    linked_post_url: null,
  },
  {
    id: 'mock-fb-dm-ai',
    organization_id: ORG,
    connection_id: 'conn-fb',
    platform: 'facebook',
    conversation_type: 'dm',
    external_thread_id: 'fb:guest-anna',
    external_participant_id: 'guest-anna',
    participant_name: 'Anna Reyes',
    participant_avatar_url: null,
    subject_preview: 'Yes, we can arrange that. Let me know your dates!',
    last_message_at: minutesAgo(30),
    last_inbound_at: minutesAgo(55),
    unread_count: 0,
    reply_status: 'replied',
    messaging_window_expires_at: hoursFromNow(22),
    linked_post_id: null,
    linked_post_url: null,
  },
  {
    id: 'mock-ig-comment-replied',
    organization_id: ORG,
    connection_id: 'conn-ig',
    platform: 'instagram',
    conversation_type: 'comment',
    external_thread_id: 'comment:ig-9901',
    external_participant_id: 'ig-user-9901',
    participant_name: '@jen.stays',
    participant_avatar_url: null,
    subject_preview: 'Sent you a DM with the booking link!',
    last_message_at: hoursAgo(3),
    last_inbound_at: hoursAgo(5),
    unread_count: 0,
    reply_status: 'replied',
    messaging_window_expires_at: null,
    linked_post_id: 'media-pool-photo',
    linked_post_url: 'https://instagram.com/p/pool-photo',
  },
];

export const MOCK_MESSAGES: Record<string, InboxMessage[]> = {
  'mock-fb-dm-unread': [
    {
      id: 'm1',
      conversation_id: 'mock-fb-dm-unread',
      direction: 'inbound',
      body_text: 'Hi! Is Azure North free on March 15–17 for 4 guests?',
      attachments: [],
      sent_at: minutesAgo(15),
      delivery_status: null,
      is_ai_generated: false,
    },
    {
      id: 'm2',
      conversation_id: 'mock-fb-dm-unread',
      direction: 'inbound',
      body_text: 'We prefer floor 26 if possible. Thanks!',
      attachments: [],
      sent_at: minutesAgo(12),
      delivery_status: null,
      is_ai_generated: false,
    },
  ],
  'mock-fb-dm-replied': [
    {
      id: 'm3',
      conversation_id: 'mock-fb-dm-replied',
      direction: 'inbound',
      body_text: 'Is the pool open in March?',
      attachments: [],
      sent_at: minutesAgo(240),
      delivery_status: null,
      is_ai_generated: false,
    },
    {
      id: 'm4',
      conversation_id: 'mock-fb-dm-replied',
      direction: 'outbound',
      body_text: 'Yes, the pool is open daily 6 AM–10 PM.',
      attachments: [],
      sent_at: minutesAgo(210),
      delivery_status: 'sent',
      is_ai_generated: false,
    },
    {
      id: 'm5',
      conversation_id: 'mock-fb-dm-replied',
      direction: 'inbound',
      body_text: 'Thank you! See you on check-in day.',
      attachments: [],
      sent_at: minutesAgo(180),
      delivery_status: null,
      is_ai_generated: false,
    },
  ],
  'mock-ig-dm-urgent': [
    {
      id: 'm6',
      conversation_id: 'mock-ig-dm-urgent',
      direction: 'inbound',
      body_text: 'Do you allow small dogs? We have a shih tzu.',
      attachments: [],
      sent_at: minutesAgo(5),
      delivery_status: null,
      is_ai_generated: false,
    },
  ],
  'mock-ig-dm-expired': [
    {
      id: 'm7',
      conversation_id: 'mock-ig-dm-expired',
      direction: 'inbound',
      body_text: 'Hi, asking about rates for 2 nights.',
      attachments: [],
      sent_at: hoursAgo(48),
      delivery_status: null,
      is_ai_generated: false,
    },
    {
      id: 'm8',
      conversation_id: 'mock-ig-dm-expired',
      direction: 'inbound',
      body_text: 'Following up on my inquiry from last week.',
      attachments: [],
      sent_at: hoursAgo(30),
      delivery_status: null,
      is_ai_generated: false,
    },
  ],
  'mock-fb-comment': [
    {
      id: 'm9',
      conversation_id: 'mock-fb-comment',
      direction: 'inbound',
      body_text: 'How much is the nightly rate for 2 pax?',
      attachments: [],
      sent_at: minutesAgo(45),
      delivery_status: null,
      is_ai_generated: false,
    },
  ],
  'mock-ig-comment': [
    {
      id: 'm10',
      conversation_id: 'mock-ig-comment',
      direction: 'inbound',
      body_text: 'Is parking included?',
      attachments: [],
      sent_at: minutesAgo(90),
      delivery_status: null,
      is_ai_generated: false,
    },
  ],
  'mock-tiktok-dm': [
    {
      id: 'm11',
      conversation_id: 'mock-tiktok-dm',
      direction: 'inbound',
      body_text: 'Saw your unit tour — available this weekend?',
      attachments: [],
      sent_at: minutesAgo(25),
      delivery_status: null,
      is_ai_generated: false,
    },
  ],
  'mock-airbnb-inquiry': [
    {
      id: 'm12',
      conversation_id: 'mock-airbnb-inquiry',
      direction: 'inbound',
      body_text:
        'Hi! I would like to book Azure North Apr 2–5 for 3 guests. Is early check-in possible around 12 PM?',
      attachments: [],
      sent_at: minutesAgo(8),
      delivery_status: null,
      is_ai_generated: false,
    },
  ],
  'mock-fb-dm-ai': [
    {
      id: 'm13',
      conversation_id: 'mock-fb-dm-ai',
      direction: 'inbound',
      body_text: 'Can we request surprise decor for an anniversary?',
      attachments: [],
      sent_at: minutesAgo(60),
      delivery_status: null,
      is_ai_generated: false,
    },
    {
      id: 'm14',
      conversation_id: 'mock-fb-dm-ai',
      direction: 'outbound',
      body_text:
        'Yes, we can arrange that. Please share your check-in date and theme preference so we can confirm availability.',
      attachments: [],
      sent_at: minutesAgo(30),
      delivery_status: 'sent',
      is_ai_generated: true,
    },
  ],
  'mock-ig-comment-replied': [
    {
      id: 'm15',
      conversation_id: 'mock-ig-comment-replied',
      direction: 'inbound',
      body_text: 'Love this place! How do I book?',
      attachments: [],
      sent_at: hoursAgo(5),
      delivery_status: null,
      is_ai_generated: false,
    },
    {
      id: 'm16',
      conversation_id: 'mock-ig-comment-replied',
      direction: 'outbound',
      body_text: 'Sent you a DM with the booking link!',
      attachments: [],
      sent_at: hoursAgo(3),
      delivery_status: 'sent',
      is_ai_generated: false,
    },
  ],
};

export const MOCK_TEMPLATES: InboxTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Availability check',
    body_text:
      'Thanks for reaching out! Please share your preferred check-in and check-out dates and number of guests so we can confirm availability.',
    platform: null,
    conversation_type: 'all',
    sort_order: 0,
    is_active: true,
  },
  {
    id: 'tpl-2',
    title: 'Rates overview',
    body_text:
      'Our rates vary by dates and number of guests. Once you share your dates, we will send a full breakdown including fees.',
    platform: 'facebook',
    conversation_type: 'all',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'tpl-3',
    title: 'Comment — book via DM',
    body_text: 'Thanks for your comment! We sent you a message with booking details.',
    platform: 'instagram',
    conversation_type: 'all',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'tpl-4',
    title: 'Airbnb inquiry',
    body_text:
      'Hi! Thanks for your inquiry. Early check-in may be possible depending on the previous guest — we will confirm closer to your stay.',
    platform: null,
    conversation_type: 'all',
    sort_order: 3,
    is_active: true,
  },
];

export const MOCK_AUTOMATION: InboxAutomationSettings = {
  autoReplyEnabled: false,
  autoReplyMode: 'draft',
  aiSystemPrompt:
    'You are a friendly Kame Home host assistant. Reply in 1–3 sentences. Ask for dates and guest count when checking availability.',
  platformToggles: {
    facebook: true,
    instagram: true,
    web: true,
    tiktok: false,
    airbnb: false,
  },
};

export const MOCK_AI_SUGGESTIONS: Record<string, string> = {
  'mock-fb-dm-unread':
    'Hi Maria! Azure North may be available Mar 15–17 for 4 guests — I will confirm and share rates shortly. Floor preference noted.',
  'mock-ig-dm-urgent':
    'Hi! Small dogs are welcome with a pet fee. Please share your dates and we will send pet policy details.',
  'mock-fb-comment':
    'Hi Patricia! Rates depend on dates and guest count — please message us your stay dates and we will reply with a quote.',
  'mock-airbnb-inquiry':
    'Hi David! Early check-in around 12 PM may be possible on Apr 2 — we will confirm 24 hours before arrival.',
  default: 'Thanks for your message! We will get back to you shortly with availability and rates.',
};

export function filterMockConversations(
  conversations: InboxConversation[],
  filters: {
    type: ThreadTypeFilter;
    status: ThreadStatusFilter;
    platform: ThreadPlatformFilter;
    search?: string;
  }
): InboxConversation[] {
  let rows = [...conversations];
  if (filters.type !== 'all') {
    rows = rows.filter((c) => c.conversation_type === filters.type);
  }
  if (filters.platform !== 'all') {
    rows = rows.filter((c) => c.platform === filters.platform);
  }
  if (filters.status === 'unread') {
    rows = rows.filter((c) => c.unread_count > 0);
  } else if (filters.status === 'pending') {
    rows = rows.filter((c) => c.reply_status === 'pending');
  } else if (filters.status === 'replied') {
    rows = rows.filter((c) => c.reply_status === 'replied');
  }
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (c) =>
        c.participant_name?.toLowerCase().includes(q) ||
        c.subject_preview?.toLowerCase().includes(q)
    );
  }
  return rows.sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );
}
