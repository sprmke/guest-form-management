import { supabase } from '@/lib/supabase/client';

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const GEMINI_LIVE_WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

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
  if (!token) throw new Error('Sign in required.');
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

export type VoiceReceptionistStartResult = {
  ephemeralToken: string;
  sessionId: string;
  model: string;
  voiceId: string;
  maxSessionSeconds: number;
};

export async function startVoiceReceptionistSession(
  propertySlug: string
): Promise<VoiceReceptionistStartResult> {
  const payload = await guestEdgePost('voice-receptionist-start', { propertySlug });
  return payload as unknown as VoiceReceptionistStartResult;
}

export async function callVoiceReceptionistTool(
  sessionId: string,
  topic: string
): Promise<{ topic: string; answer: string }> {
  const payload = await guestEdgePost('voice-receptionist-tool', { sessionId, topic });
  return payload as unknown as { topic: string; answer: string };
}

export type VoiceReceptionistRole = 'guest' | 'assistant';
export type VoiceReceptionistTranscriptTurn = {
  role: VoiceReceptionistRole;
  text: string;
  at?: string;
};
export type VoiceReceptionistEndReason = 'guest_ended' | 'timeout' | 'cap_reached' | 'error';

export async function endVoiceReceptionistSession(
  sessionId: string,
  input: { endReason: VoiceReceptionistEndReason; transcript: VoiceReceptionistTranscriptTurn[] }
): Promise<{ endedAt: string; durationSeconds: number }> {
  const payload = await guestEdgePost('voice-receptionist-end', {
    sessionId,
    endReason: input.endReason,
    transcript: input.transcript,
  });
  return payload as unknown as { endedAt: string; durationSeconds: number };
}

export function geminiLiveWebSocketUrl(ephemeralToken: string): string {
  return `${GEMINI_LIVE_WS_BASE}?access_token=${encodeURIComponent(ephemeralToken)}`;
}
