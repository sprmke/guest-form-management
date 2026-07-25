import { supabase } from '@/lib/supabase/client';

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type EdgeJson = {
  success?: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

function unwrapEdgePayload(json: EdgeJson): Record<string, unknown> {
  if (!json.success) throw new Error(json.error ?? 'Request failed');
  const payload = json.data;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }
  return json as Record<string, unknown>;
}

async function guestJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to message the host.');
  return token;
}

async function guestEdgePost(path: string, body: Record<string, unknown>) {
  const jwt = await guestJwt();
  const res = await fetch(`${FUNCTIONS_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as EdgeJson;
  return unwrapEdgePayload(json);
}

async function guestEdgeGet(path: string, search: URLSearchParams) {
  const jwt = await guestJwt();
  const qs = search.toString();
  const res = await fetch(`${FUNCTIONS_URL}/${path}${qs ? `?${qs}` : ''}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  });
  const json = (await res.json()) as EdgeJson;
  return unwrapEdgePayload(json);
}

export type GuestChatStartResult = {
  conversationId: string;
  property: {
    id: string;
    slug: string;
    name: string;
  };
  host: {
    organizationName: string;
    ownerName: string;
    ownerAvatarUrl: string | null;
  };
  inquiryCheckIn: string;
  inquiryCheckOut: string;
};

export type GuestChatResumeResult = {
  hasMessages: boolean;
  conversationId: string | null;
  inquiryCheckIn: string | null;
  inquiryCheckOut: string | null;
  property: {
    id: string;
    slug: string;
    name: string;
  } | null;
  host: {
    organizationName: string;
    ownerName: string;
    ownerAvatarUrl: string | null;
  } | null;
};

export type GuestChatMessage = {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body_text: string | null;
  sent_at: string;
  is_ai_generated: boolean;
};

export async function startGuestWebChat(input: {
  propertySlug: string;
  checkInDate: string;
  checkOutDate: string;
}): Promise<GuestChatStartResult> {
  const payload = await guestEdgePost('guest-web-chat-start', input);
  return payload as unknown as GuestChatStartResult;
}

export async function fetchGuestWebChatResume(
  propertySlug: string
): Promise<GuestChatResumeResult> {
  const params = new URLSearchParams({ property_slug: propertySlug });
  const payload = await guestEdgeGet('guest-web-chat-resume', params);
  return payload as unknown as GuestChatResumeResult;
}

export async function fetchGuestChatMessages(
  conversationId: string,
  before?: string
): Promise<{ messages: GuestChatMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams({ conversation_id: conversationId });
  if (before) params.set('before', before);
  const payload = await guestEdgeGet('guest-web-chat-messages', params);
  return {
    messages: (payload.messages as GuestChatMessage[] | undefined) ?? [],
    hasMore: !!payload.hasMore,
  };
}

export async function sendGuestChatMessage(conversationId: string, text: string): Promise<void> {
  await guestEdgePost('guest-web-chat-messages', { conversationId, text });
}
