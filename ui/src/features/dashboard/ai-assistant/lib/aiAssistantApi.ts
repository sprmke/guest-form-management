import { scopedOrgFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';

import { supabase } from '@/lib/supabase/client';

export type ChatBlock =
  | { type: 'text'; text: string }
  | {
      type: 'booking_card';
      bookingId: string;
      guestName: string;
      status: string;
      checkIn: string;
      checkOut: string;
      propertyName: string;
      balanceDue: number | null;
    }
  | { type: 'stat_list'; title: string; items: Array<{ label: string; value: string }> }
  | {
      type: 'data_table';
      title: string;
      columns: string[];
      rows: Array<Record<string, string | number>>;
    }
  | { type: 'link_list'; title: string; links: Array<{ label: string; href: string }> }
  | {
      type: 'action_confirmation';
      actionId: string;
      toolName: string;
      riskTier: 'tier1_auto' | 'tier2_confirmed';
      summary: string;
      details: Array<{ label: string; value: string }>;
      status: 'proposed' | 'confirmed' | 'executed' | 'denied' | 'expired';
    };

export type PageContext = { propertyId?: string | null; bookingId?: string | null };

export type ChatTurnResponse = {
  conversationId: string;
  blocks: ChatBlock[];
  upgradeHook?: boolean;
};

export type ConfirmActionResponse = {
  status: 'executed' | 'denied' | 'expired' | 'pending';
  ok?: boolean;
  error?: string | null;
  data?: unknown;
  alreadyResolved?: boolean;
};

export type AiDashboardAssistantOrgSettings = {
  organizationId: string;
  enabled: boolean;
  disabledPropertyIds: string[];
  dailyMessageLimit: number;
  monthlyMessageLimit: number;
  dailyWriteActionLimit: number;
  updatedBy: string | null;
  updatedAt: string;
  platformEnabled: boolean;
};

export type AiDashboardAssistantGlobalSettings = {
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
};

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

async function callAiAssistantFn<T>(url: string, init?: RequestInit): Promise<T> {
  const jwt = await getAdminJwt();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json = (await res.json()) as { success?: boolean; error?: string; data?: T } & Record<
    string,
    unknown
  >;
  if (!res.ok || !json.success) {
    const err = new Error(json.error ?? 'Request failed') as Error & {
      status?: number;
      upgradeHook?: boolean;
    };
    err.status = res.status;
    err.upgradeHook = json.upgradeHook === true;
    throw err;
  }
  return json.data as T;
}

function baseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
}

export function sendChatMessage(input: {
  orgSlug: string;
  conversationId?: string | null;
  pageContext: PageContext;
  message: string;
}): Promise<ChatTurnResponse> {
  return callAiAssistantFn<ChatTurnResponse>(`${baseUrl()}/dashboard-assistant-chat`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function confirmAssistantAction(input: {
  actionId: string;
  confirm: boolean;
}): Promise<ConfirmActionResponse> {
  return callAiAssistantFn<ConfirmActionResponse>(`${baseUrl()}/dashboard-assistant-confirm`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchAiDashboardAssistantSettings(
  orgSlug: string | null,
  orgId: string | null
): Promise<AiDashboardAssistantOrgSettings> {
  return callAiAssistantFn<AiDashboardAssistantOrgSettings>(
    scopedOrgFunctionsUrl('dashboard-assistant-settings', orgSlug, orgId)
  );
}

export function updateAiDashboardAssistantSettings(
  orgSlug: string | null,
  orgId: string | null,
  patch: {
    enabled?: boolean;
    disabledPropertyIds?: string[];
    dailyMessageLimit?: number;
    monthlyMessageLimit?: number;
    dailyWriteActionLimit?: number;
  }
): Promise<AiDashboardAssistantOrgSettings> {
  return callAiAssistantFn<AiDashboardAssistantOrgSettings>(
    scopedOrgFunctionsUrl('dashboard-assistant-settings', orgSlug, orgId),
    { method: 'PATCH', body: JSON.stringify(patch) }
  );
}

export function fetchAiDashboardAssistantGlobalSettings(): Promise<AiDashboardAssistantGlobalSettings> {
  return callAiAssistantFn<AiDashboardAssistantGlobalSettings>(
    `${baseUrl()}/dashboard-assistant-global-settings`
  );
}

export function updateAiDashboardAssistantGlobalSettings(patch: {
  enabled?: boolean;
}): Promise<AiDashboardAssistantGlobalSettings> {
  return callAiAssistantFn<AiDashboardAssistantGlobalSettings>(
    `${baseUrl()}/dashboard-assistant-global-settings`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );
}

export type AiAssistantConversationSummary = {
  id: string;
  title: string | null;
  property_id: string | null;
  last_message_at: string;
  created_at: string;
};

export type AiAssistantMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content_text: string | null;
  blocks: ChatBlock[];
  created_at: string;
};

export function fetchAiAssistantConversations(
  orgSlug: string | null,
  orgId: string | null
): Promise<{ conversations: AiAssistantConversationSummary[] }> {
  return callAiAssistantFn(
    scopedOrgFunctionsUrl('dashboard-assistant-conversations', orgSlug, orgId)
  );
}

export function fetchAiAssistantConversationMessages(
  conversationId: string
): Promise<{ conversation: AiAssistantConversationSummary; messages: AiAssistantMessageRow[] }> {
  return callAiAssistantFn(
    `${baseUrl()}/dashboard-assistant-conversations?conversation_id=${encodeURIComponent(conversationId)}`
  );
}
