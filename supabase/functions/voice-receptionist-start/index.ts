/**
 * voice-receptionist-start — Mint a locked Gemini Live ephemeral token for a guest voice
 * session. Checks the global kill switch, the property's opt-in, and session caps before
 * minting anything — the caller never gets a token when any of those fail.
 * Auth: any signed-in guest (Supabase JWT, not admin allow list).
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { buildAiGroundingFacts } from '../_shared/inboxAiGuestContext.ts';
import { loadAuthUserProfile } from '../_shared/authUserProfile.ts';
import { buildWebThreadId } from '../_shared/webGuestChatIds.ts';
import { ensureWebChannelConnection } from '../_shared/webGuestChatService.ts';
import { upsertConversation } from '../_shared/socialInboxService.ts';
import { mintGeminiLiveEphemeralToken } from '../_shared/geminiLiveEphemeral.ts';
import {
  createVoiceReceptionistSession,
  enforceVoiceReceptionistCaps,
  getGlobalVoiceReceptionistSettings,
  getVoiceReceptionistSettings,
  VoiceReceptionistCapError,
} from '../_shared/voiceReceptionistService.ts';

// Mirrors socialInboxAiService.ts's safetyPolicy — same refusal boundary, spoken tone.
const SAFETY_POLICY =
  'Answer normal guest questions about this stay and property using Known facts and the getPropertyFact tool. ' +
  'Normal topics include availability, rates, check-in/check-out, amenities, parking, pets, wifi, payment methods, cancellation policy, and directions. ' +
  "Only decline when asked about other guests' bookings, owner revenue/expenses/profit, staff information, or internal operations — politely say you'll have the host team follow up. " +
  'Never invent facts that are not in Known facts or returned by getPropertyFact.';

serveAuthenticated('voice-receptionist-start', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const body = await readJsonBody(req);
  const propertySlug = String(body.propertySlug ?? body.property_slug ?? '').trim();
  if (!propertySlug) {
    return jsonError(req, 'propertySlug is required', 400);
  }

  try {
    const global = await getGlobalVoiceReceptionistSettings();
    if (!global.enabled) {
      return jsonError(req, 'Voice receptionist is currently unavailable.', 503);
    }

    const sb = createServiceClient();
    const { data: propertyRow, error: propertyError } = await sb
      .from('properties')
      .select('id, organization_id, name')
      .eq('slug', propertySlug)
      .eq('status', 'ACTIVE')
      .maybeSingle();
    if (propertyError || !propertyRow) {
      return jsonError(req, 'Property not found', 404);
    }
    const propertyId = propertyRow.id as string;
    const orgId = propertyRow.organization_id as string;

    const settings = await getVoiceReceptionistSettings(propertyId);
    if (!settings.enabled) {
      return jsonError(req, 'Voice receptionist is not enabled for this property.', 503);
    }

    await enforceVoiceReceptionistCaps(propertyId, user.id, settings);

    const profile = await loadAuthUserProfile(sb, user.id);
    const participantName = profile.name.trim() || profile.email.split('@')[0]?.trim() || 'Guest';

    // Attach to the guest's existing web-chat thread for this property so the voice
    // session's transcript (written by a later task) lands in the same Inbox thread.
    const connection = await ensureWebChannelConnection(orgId);
    const threadId = buildWebThreadId(propertyId, user.id);
    const conversation = await upsertConversation({
      organization_id: orgId,
      connection_id: connection.id,
      platform: 'web',
      conversation_type: 'dm',
      external_thread_id: threadId,
      external_participant_id: user.id,
      participant_name: participantName,
      participant_avatar_url: profile.avatarUrl,
      property_id: propertyId,
      guest_user_id: user.id,
    });

    const grounding = await buildAiGroundingFacts(orgId, propertyId, {
      participantName,
      platform: 'web',
    });

    const personaOverride = settings.personaPrompt?.trim()
      ? `\n\nAdditional persona instructions from the host: ${settings.personaPrompt.trim()}`
      : '';
    const basePrompt =
      `You are a friendly, concise voice receptionist for ${String(propertyRow.name ?? 'the property')}. ` +
      'This is a spoken conversation, so keep replies short (1-2 sentences) and natural. ' +
      'Call getPropertyFact for anything not already covered by Known facts before guessing.';
    const systemInstruction = `${basePrompt}${personaOverride}\n\n${SAFETY_POLICY}\n\nKnown facts:\n${grounding.factsText}`;

    // Mint before inserting the session row so a Gemini failure does not burn a daily-cap slot.
    const minted = await mintGeminiLiveEphemeralToken({
      voiceName: settings.voiceId,
      systemInstruction,
      expireMinutes: Math.max(Math.ceil(settings.maxSessionSeconds / 60) + 2, 5),
    });

    const session = await createVoiceReceptionistSession({
      propertyId,
      guestUserId: user.id,
      conversationId: conversation.id,
    });

    return jsonSuccess(req, {
      ephemeralToken: minted.ephemeralToken,
      sessionId: session.id,
      model: minted.model,
      voiceId: minted.voiceName,
      maxSessionSeconds: settings.maxSessionSeconds,
    });
  } catch (e) {
    if (e instanceof VoiceReceptionistCapError) {
      return jsonError(req, e.message, 429);
    }
    const message = (e as Error).message;
    if (message.includes('GEMINI_API_KEY') || message.includes('GEMINI_API_KEYS')) {
      return jsonError(req, 'Voice receptionist is not configured.', 503);
    }
    throw e;
  }
});
