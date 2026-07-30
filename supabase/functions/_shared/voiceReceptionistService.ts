/**
 * AI Voice Receptionist — global kill switch, per-property settings, and session caps.
 * Mirrors the social_inbox_settings ensure/get/patch pattern.
 */

import { createServiceClient } from './orgAuth.ts';
import { GEMINI_LIVE_VOICES, type GeminiLiveVoice } from './geminiLiveEphemeral.ts';

const MANILA_TZ = 'Asia/Manila';

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
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0;
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
    patch.maxSessionSeconds = body.maxSessionSeconds;
  }
  if (body.maxSessionsPerGuestPerDay !== undefined) {
    if (!isPositiveInt(body.maxSessionsPerGuestPerDay)) {
      return { patch, error: 'maxSessionsPerGuestPerDay must be a positive integer' };
    }
    patch.maxSessionsPerGuestPerDay = body.maxSessionsPerGuestPerDay;
  }
  if (body.maxConcurrentSessions !== undefined) {
    if (!isPositiveInt(body.maxConcurrentSessions)) {
      return { patch, error: 'maxConcurrentSessions must be a positive integer' };
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

  const staleBeforeIso = new Date(
    Date.now() - settings.maxSessionSeconds * 1000
  ).toISOString();
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
