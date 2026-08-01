/**
 * AI Voice Receptionist — global kill switch, per-property settings, and session caps.
 * Mirrors the social_inbox_settings ensure/get/patch pattern.
 */

import { createServiceClient } from './orgAuth.ts';
import { GEMINI_LIVE_VOICES, type GeminiLiveVoice } from './geminiLiveEphemeral.ts';
import { insertMessageIfNew, updateConversationAfterMessage } from './socialInboxService.ts';

const MANILA_TZ = 'Asia/Manila';

/**
 * Rough Gemini Live native-audio blended rate (input $0.005/min + output $0.018/min,
 * published per-minute equivalents as of this writing) applied to wall-clock duration.
 * Actual billing is token-based and re-bills prior turns each round-trip, so real cost is
 * higher for longer conversations — this is a visibility estimate, not an invoice figure.
 */
const ESTIMATED_COST_PER_MINUTE_USD = 0.023;

export type VoiceReceptionistGlobalSettingsDto = {
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
};

export type VoiceReceptionistSettingsDto = {
  propertyId: string;
  enabled: boolean;
  voiceId: string;
  personaPrompt: string | null;
  maxSessionSeconds: number;
  maxSessionsPerGuestPerDay: number;
  maxConcurrentSessions: number;
  availableVoices: readonly string[];
};

export class VoiceReceptionistCapError extends Error {
  constructor(
    message: string,
    public readonly code: 'guest_daily_cap' | 'concurrent_cap'
  ) {
    super(message);
    this.name = 'VoiceReceptionistCapError';
  }
}

function db() {
  return createServiceClient();
}

export async function getGlobalVoiceReceptionistSettings(): Promise<VoiceReceptionistGlobalSettingsDto> {
  const sb = db();
  const { data, error } = await sb
    .from('voice_receptionist_global_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.error('[voiceReceptionistService] load global settings:', error.message);
    throw new Error('Failed to load global voice receptionist settings');
  }
  return {
    enabled: data?.enabled ?? false,
    updatedBy: (data?.updated_by as string | null) ?? null,
    updatedAt: (data?.updated_at as string | undefined) ?? new Date().toISOString(),
  };
}

export async function setGlobalVoiceReceptionistEnabled(
  enabled: boolean,
  updatedByUserId: string
): Promise<VoiceReceptionistGlobalSettingsDto> {
  const sb = db();
  const { data, error } = await sb
    .from('voice_receptionist_global_settings')
    .update({ enabled, updated_by: updatedByUserId, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('*')
    .single();
  if (error) {
    console.error('[voiceReceptionistService] update global settings:', error.message);
    throw new Error('Failed to update global voice receptionist settings');
  }
  return {
    enabled: data.enabled,
    updatedBy: (data.updated_by as string | null) ?? null,
    updatedAt: data.updated_at as string,
  };
}

async function ensureVoiceReceptionistSettingsRow(propertyId: string): Promise<void> {
  const sb = db();
  await sb
    .from('voice_receptionist_settings')
    .upsert({ property_id: propertyId }, { onConflict: 'property_id', ignoreDuplicates: true });
}

function serializeSettingsRow(
  propertyId: string,
  row: Record<string, unknown> | null
): VoiceReceptionistSettingsDto {
  return {
    propertyId,
    enabled: (row?.enabled as boolean | undefined) ?? false,
    voiceId: (row?.voice_id as string | undefined) ?? 'Kore',
    personaPrompt: (row?.persona_prompt as string | null | undefined) ?? null,
    maxSessionSeconds: (row?.max_session_seconds as number | undefined) ?? 300,
    maxSessionsPerGuestPerDay: (row?.max_sessions_per_guest_per_day as number | undefined) ?? 3,
    maxConcurrentSessions: (row?.max_concurrent_sessions as number | undefined) ?? 3,
    availableVoices: GEMINI_LIVE_VOICES,
  };
}

export async function getVoiceReceptionistSettings(
  propertyId: string
): Promise<VoiceReceptionistSettingsDto> {
  await ensureVoiceReceptionistSettingsRow(propertyId);
  const sb = db();
  const { data, error } = await sb
    .from('voice_receptionist_settings')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error) {
    console.error('[voiceReceptionistService] load property settings:', error.message);
    throw new Error('Failed to load voice receptionist settings');
  }
  return serializeSettingsRow(propertyId, data);
}

export type VoiceReceptionistSettingsPatch = {
  enabled?: boolean;
  voiceId?: string;
  personaPrompt?: string | null;
  maxSessionSeconds?: number;
  maxSessionsPerGuestPerDay?: number;
  maxConcurrentSessions?: number;
};

function isPositiveInt(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
  );
}

export function validateVoiceReceptionistPatch(body: Record<string, unknown>): {
  patch: VoiceReceptionistSettingsPatch;
  error: string | null;
} {
  const patch: VoiceReceptionistSettingsPatch = {};

  if (body.enabled !== undefined) {
    patch.enabled = Boolean(body.enabled);
  }
  if (body.voiceId !== undefined) {
    const voiceId = String(body.voiceId ?? '').trim();
    if (!GEMINI_LIVE_VOICES.includes(voiceId as GeminiLiveVoice)) {
      return { patch, error: `voiceId must be one of: ${GEMINI_LIVE_VOICES.join(', ')}` };
    }
    patch.voiceId = voiceId;
  }
  if (body.personaPrompt !== undefined) {
    if (body.personaPrompt === null) {
      patch.personaPrompt = null;
    } else if (typeof body.personaPrompt === 'string') {
      patch.personaPrompt = body.personaPrompt.trim() || null;
    } else {
      return { patch, error: 'personaPrompt must be a string or null' };
    }
  }
  if (body.maxSessionSeconds !== undefined) {
    if (!isPositiveInt(body.maxSessionSeconds)) {
      return { patch, error: 'maxSessionSeconds must be a positive integer' };
    }
    if (body.maxSessionSeconds < 60 || body.maxSessionSeconds > 3600) {
      return { patch, error: 'maxSessionSeconds must be between 60 and 3600' };
    }
    patch.maxSessionSeconds = body.maxSessionSeconds;
  }
  if (body.maxSessionsPerGuestPerDay !== undefined) {
    if (!isPositiveInt(body.maxSessionsPerGuestPerDay)) {
      return { patch, error: 'maxSessionsPerGuestPerDay must be a positive integer' };
    }
    if (body.maxSessionsPerGuestPerDay > 999) {
      return { patch, error: 'maxSessionsPerGuestPerDay must be between 1 and 999' };
    }
    patch.maxSessionsPerGuestPerDay = body.maxSessionsPerGuestPerDay;
  }
  if (body.maxConcurrentSessions !== undefined) {
    if (!isPositiveInt(body.maxConcurrentSessions)) {
      return { patch, error: 'maxConcurrentSessions must be a positive integer' };
    }
    if (body.maxConcurrentSessions > 50) {
      return { patch, error: 'maxConcurrentSessions must be between 1 and 50' };
    }
    patch.maxConcurrentSessions = body.maxConcurrentSessions;
  }

  return { patch, error: null };
}

export async function updateVoiceReceptionistSettings(
  propertyId: string,
  patch: VoiceReceptionistSettingsPatch
): Promise<VoiceReceptionistSettingsDto> {
  await ensureVoiceReceptionistSettingsRow(propertyId);
  const sb = db();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.enabled !== undefined) dbPatch.enabled = patch.enabled;
  if (patch.voiceId !== undefined) dbPatch.voice_id = patch.voiceId;
  if (patch.personaPrompt !== undefined) dbPatch.persona_prompt = patch.personaPrompt;
  if (patch.maxSessionSeconds !== undefined) dbPatch.max_session_seconds = patch.maxSessionSeconds;
  if (patch.maxSessionsPerGuestPerDay !== undefined) {
    dbPatch.max_sessions_per_guest_per_day = patch.maxSessionsPerGuestPerDay;
  }
  if (patch.maxConcurrentSessions !== undefined) {
    dbPatch.max_concurrent_sessions = patch.maxConcurrentSessions;
  }

  const { data, error } = await sb
    .from('voice_receptionist_settings')
    .update(dbPatch)
    .eq('property_id', propertyId)
    .select('*')
    .single();
  if (error) {
    console.error('[voiceReceptionistService] update property settings:', error.message);
    throw new Error('Failed to update voice receptionist settings');
  }
  return serializeSettingsRow(propertyId, data);
}

/** Start of "today" in Manila as an ISO instant (no DST in Asia/Manila, fixed UTC+8). */
function manilaStartOfTodayIso(): string {
  const todayYmd = new Date().toLocaleDateString('en-CA', { timeZone: MANILA_TZ });
  return new Date(`${todayYmd}T00:00:00+08:00`).toISOString();
}

/**
 * Enforces per-guest daily cap and property-wide concurrent cap.
 * A session with no `ended_at` is treated as still-open only while within
 * `maxSessionSeconds` of `started_at` — stale rows (client crashed, no explicit end
 * call yet) age out of the concurrency count rather than permanently occupying a slot.
 */
export async function enforceVoiceReceptionistCaps(
  propertyId: string,
  guestUserId: string,
  settings: VoiceReceptionistSettingsDto
): Promise<void> {
  const sb = db();

  const { count: dailyCount, error: dailyError } = await sb
    .from('voice_receptionist_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('guest_user_id', guestUserId)
    .gte('started_at', manilaStartOfTodayIso());
  if (dailyError) {
    console.error('[voiceReceptionistService] daily cap check:', dailyError.message);
    throw new Error('Failed to check voice session limits');
  }
  if ((dailyCount ?? 0) >= settings.maxSessionsPerGuestPerDay) {
    throw new VoiceReceptionistCapError(
      `You've reached today's limit of ${settings.maxSessionsPerGuestPerDay} voice sessions for this property. Please try again tomorrow.`,
      'guest_daily_cap'
    );
  }

  const staleBeforeIso = new Date(Date.now() - settings.maxSessionSeconds * 1000).toISOString();
  const { count: concurrentCount, error: concurrentError } = await sb
    .from('voice_receptionist_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .is('ended_at', null)
    .gte('started_at', staleBeforeIso);
  if (concurrentError) {
    console.error('[voiceReceptionistService] concurrent cap check:', concurrentError.message);
    throw new Error('Failed to check voice session limits');
  }
  if ((concurrentCount ?? 0) >= settings.maxConcurrentSessions) {
    throw new VoiceReceptionistCapError(
      'Our voice receptionist is at capacity for this property right now. Please try again shortly.',
      'concurrent_cap'
    );
  }
}

export async function createVoiceReceptionistSession(input: {
  propertyId: string;
  guestUserId: string;
  conversationId: string | null;
}): Promise<{ id: string; startedAt: string }> {
  const sb = db();
  const { data, error } = await sb
    .from('voice_receptionist_sessions')
    .insert({
      property_id: input.propertyId,
      guest_user_id: input.guestUserId,
      conversation_id: input.conversationId,
    })
    .select('id, started_at')
    .single();
  if (error) {
    console.error('[voiceReceptionistService] create session:', error.message);
    throw new Error('Failed to start voice session');
  }
  return { id: data.id as string, startedAt: data.started_at as string };
}

export async function loadVoiceReceptionistSessionForGuest(
  sessionId: string,
  guestUserId: string
): Promise<{ id: string; propertyId: string; endedAt: string | null } | null> {
  const sb = db();
  const { data, error } = await sb
    .from('voice_receptionist_sessions')
    .select('id, property_id, ended_at')
    .eq('id', sessionId)
    .eq('guest_user_id', guestUserId)
    .maybeSingle();
  if (error) {
    console.error('[voiceReceptionistService] load session:', error.message);
    throw new Error('Failed to load voice session');
  }
  if (!data) return null;
  return {
    id: data.id as string,
    propertyId: data.property_id as string,
    endedAt: (data.ended_at as string | null) ?? null,
  };
}

/** Global kill switch AND property opt-in — the same gate `voice-receptionist-start` enforces. */
export async function isVoiceReceptionistAvailableForProperty(
  propertyId: string
): Promise<boolean> {
  try {
    const global = await getGlobalVoiceReceptionistSettings();
    if (!global.enabled) return false;
    const settings = await getVoiceReceptionistSettings(propertyId);
    return settings.enabled;
  } catch (error) {
    // Never break guest chat start/resume if voice settings are missing or unreadable.
    console.error(
      '[voiceReceptionistService] availability check failed:',
      (error as Error).message
    );
    return false;
  }
}

export type VoiceReceptionistEndReason = 'guest_ended' | 'timeout' | 'cap_reached' | 'error';

export type VoiceReceptionistSessionForEnd = {
  id: string;
  propertyId: string;
  conversationId: string | null;
  startedAt: string;
  endedAt: string | null;
};

export async function loadVoiceReceptionistSessionForEnd(
  sessionId: string,
  guestUserId: string
): Promise<VoiceReceptionistSessionForEnd | null> {
  const sb = db();
  const { data, error } = await sb
    .from('voice_receptionist_sessions')
    .select('id, property_id, conversation_id, started_at, ended_at')
    .eq('id', sessionId)
    .eq('guest_user_id', guestUserId)
    .maybeSingle();
  if (error) {
    console.error('[voiceReceptionistService] load session for end:', error.message);
    throw new Error('Failed to load voice session');
  }
  if (!data) return null;
  return {
    id: data.id as string,
    propertyId: data.property_id as string,
    conversationId: (data.conversation_id as string | null) ?? null,
    startedAt: data.started_at as string,
    endedAt: (data.ended_at as string | null) ?? null,
  };
}

/** Sets ended_at/duration/end_reason once — safe to call again for an already-ended session. */
export async function endVoiceReceptionistSession(
  session: VoiceReceptionistSessionForEnd,
  endReason: VoiceReceptionistEndReason
): Promise<{ endedAt: string; durationSeconds: number }> {
  if (session.endedAt) {
    const durationSeconds = Math.max(
      0,
      Math.round(
        (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
      )
    );
    return { endedAt: session.endedAt, durationSeconds };
  }

  const endedAt = new Date().toISOString();
  const durationSeconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
  );
  const estimatedCostUsd =
    Math.round((durationSeconds / 60) * ESTIMATED_COST_PER_MINUTE_USD * 10000) / 10000;

  const sb = db();
  const { error } = await sb
    .from('voice_receptionist_sessions')
    .update({
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      end_reason: endReason,
      estimated_cost_usd: estimatedCostUsd,
    })
    .eq('id', session.id)
    .is('ended_at', null);
  if (error) {
    console.error('[voiceReceptionistService] end session:', error.message);
    throw new Error('Failed to end voice session');
  }

  return { endedAt, durationSeconds };
}

export type VoiceReceptionistUsageSummary = {
  sessionsToday: number;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  totalDurationSeconds: number;
  avgDurationSeconds: number;
  estimatedCostUsdLast30Days: number;
  endReasonCounts: Record<string, number>;
  recentSessions: Array<{
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number | null;
    endReason: string | null;
    estimatedCostUsd: number | null;
  }>;
};

/**
 * Lightweight admin usage/cost read for a property's voice receptionist — enough to spot
 * volume and rough spend at a glance, not a full analytics product (last 30 days window).
 */
export async function getVoiceReceptionistUsageSummary(
  propertyId: string
): Promise<VoiceReceptionistUsageSummary> {
  const sb = db();
  const since30dIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb
    .from('voice_receptionist_sessions')
    .select('started_at, ended_at, duration_seconds, end_reason, estimated_cost_usd')
    .eq('property_id', propertyId)
    .gte('started_at', since30dIso)
    .order('started_at', { ascending: false });
  if (error) {
    console.error('[voiceReceptionistService] load usage summary:', error.message);
    throw new Error('Failed to load voice receptionist usage');
  }

  const rows = data ?? [];
  const todayStartIso = manilaStartOfTodayIso();
  const since7dIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let sessionsToday = 0;
  let sessionsLast7Days = 0;
  let totalDurationSeconds = 0;
  let durationCount = 0;
  let estimatedCostUsdLast30Days = 0;
  const endReasonCounts: Record<string, number> = {};

  for (const row of rows) {
    const startedAt = row.started_at as string;
    if (startedAt >= todayStartIso) sessionsToday += 1;
    if (startedAt >= since7dIso) sessionsLast7Days += 1;

    const duration = row.duration_seconds as number | null;
    if (typeof duration === 'number') {
      totalDurationSeconds += duration;
      durationCount += 1;
    }

    const cost = row.estimated_cost_usd as number | null;
    if (typeof cost === 'number') estimatedCostUsdLast30Days += cost;

    const reason = (row.end_reason as string | null) ?? 'open';
    endReasonCounts[reason] = (endReasonCounts[reason] ?? 0) + 1;
  }

  return {
    sessionsToday,
    sessionsLast7Days,
    sessionsLast30Days: rows.length,
    totalDurationSeconds,
    avgDurationSeconds: durationCount > 0 ? Math.round(totalDurationSeconds / durationCount) : 0,
    estimatedCostUsdLast30Days: Math.round(estimatedCostUsdLast30Days * 10000) / 10000,
    endReasonCounts,
    recentSessions: rows.slice(0, 10).map((row) => ({
      startedAt: row.started_at as string,
      endedAt: (row.ended_at as string | null) ?? null,
      durationSeconds: (row.duration_seconds as number | null) ?? null,
      endReason: (row.end_reason as string | null) ?? null,
      estimatedCostUsd: (row.estimated_cost_usd as number | null) ?? null,
    })),
  };
}

export type VoiceReceptionistTranscriptTurn = {
  role: 'guest' | 'assistant';
  text: string;
  at?: string;
};

export function sanitizeVoiceTranscriptTurns(input: unknown): VoiceReceptionistTranscriptTurn[] {
  if (!Array.isArray(input)) return [];
  const turns: VoiceReceptionistTranscriptTurn[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const role = row.role === 'assistant' ? 'assistant' : row.role === 'guest' ? 'guest' : null;
    const text = typeof row.text === 'string' ? row.text.trim() : '';
    if (!role || !text) continue;
    const at =
      typeof row.at === 'string' && !Number.isNaN(new Date(row.at).getTime()) ? row.at : undefined;
    turns.push({ role, text, at });
  }
  return turns;
}

/**
 * Batch-writes committed voice turns into the property's existing social_messages thread
 * with source_mode='voice' so the admin Inbox shows a unified history. Idempotent per
 * sessionId (external_message_id is deterministic) — safe to retry on network failure.
 */
export async function writeVoiceTranscriptToConversation(
  sessionId: string,
  conversationId: string,
  guestUserId: string,
  sessionStartedAt: string,
  turns: VoiceReceptionistTranscriptTurn[]
): Promise<void> {
  if (!turns.length) return;

  const sb = db();
  const { data: conv, error } = await sb
    .from('social_conversations')
    .select('organization_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (error || !conv) {
    console.error('[voiceReceptionistService] load conversation for transcript:', error?.message);
    return;
  }
  const organizationId = conv.organization_id as string;

  let lastTs = new Date(sessionStartedAt).getTime();
  let lastGuestText: string | null = null;
  let lastAssistantText: string | null = null;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    const candidateTs = turn.at ? new Date(turn.at).getTime() : lastTs + 1000;
    const ts = Math.max(candidateTs, lastTs + 1);
    lastTs = ts;
    const sentAt = new Date(ts).toISOString();

    await insertMessageIfNew({
      organization_id: organizationId,
      conversation_id: conversationId,
      direction: turn.role === 'guest' ? 'inbound' : 'outbound',
      external_message_id: `voice:${sessionId}:${i}`,
      body_text: turn.text,
      attachments: [],
      sent_at: sentAt,
      delivery_status: 'sent',
      sent_by_user_id: turn.role === 'guest' ? guestUserId : null,
      is_ai_generated: turn.role === 'assistant',
      source_mode: 'voice',
    });

    if (turn.role === 'guest') lastGuestText = turn.text;
    else lastAssistantText = turn.text;
  }

  const lastTurn = turns[turns.length - 1]!;
  await updateConversationAfterMessage(conversationId, {
    subject_preview: lastTurn.text.slice(0, 500),
    last_message_at: new Date(lastTs).toISOString(),
    reply_status: lastTurn.role === 'assistant' ? 'replied' : 'pending',
    unread_delta: lastGuestText ? 1 : 0,
    guest_unread_delta: lastAssistantText ? 1 : 0,
  });
}
