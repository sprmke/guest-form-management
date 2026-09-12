/**
 * voice-receptionist-start — Mint a locked Gemini Live ephemeral token for a guest voice
 * session. Checks the global kill switch, the property's opt-in, and session caps before
 * minting anything — the caller never gets a token when any of those fail.
 * Auth: any signed-in guest (Supabase JWT, not admin allow list).
 */

import {
  assertOrgAndPropertyAiQuota,
  getOrgAiUsageSummary,
  isAiPlatformDisabledError,
  isAiQuotaError,
} from '../_shared/aiUsageService.ts';
import { jsonError, jsonSuccess, jsonUpgradeHook, readJsonBody } from '../_shared/httpResponse.ts';
import { PlanFeatureRequiredError, requirePropertyFeature } from '../_shared/planEntitlements.ts';
import { identityFromRequest, rateLimitGate } from '../_shared/rateLimit.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { buildAiGroundingFacts } from '../_shared/inboxAiGuestContext.ts';
import { loadAuthUserProfile } from '../_shared/authUserProfile.ts';
import { buildWebThreadId } from '../_shared/webGuestChatIds.ts';
import { ensureWebChannelConnection } from '../_shared/webGuestChatService.ts';
import { upsertConversation } from '../_shared/socialInboxService.ts';
import { mintGeminiLiveEphemeralToken } from '../_shared/geminiLiveEphemeral.ts';
import { resolvePropertyGuestName } from '../_shared/propertyGuestName.ts';
import {
  createVoiceReceptionistSession,
  enforceVoiceReceptionistCaps,
  getGlobalVoiceReceptionistSettings,
  getVoiceReceptionistSettings,
  VoiceReceptionistCapError,
} from '../_shared/voiceReceptionistService.ts';

// Compact spoken safety + tool policy (Phase 6.2 — keep the locked prompt small).
const VOICE_SYSTEM_CORE =
  'Friendly concise voice receptionist. Reply in clear English in 1–2 short sentences. ' +
  'When speaking money amounts, always say "pesos" (e.g. "four hundred pesos") — never say "PHP", "P H P", or spell the currency code. ' +
  'Answer ONLY from Known facts below — do not call getPropertyFact when those facts already cover the question ' +
  '(amenities, check-in/out, parking, pets, rates, wifi, location/map, house rules, capacity, payment, cancellation, blocked dates). ' +
  'Call getPropertyFact only if a needed detail is missing from Known facts or the guest needs a fresh availability check. ' +
  'When sharing a location, put one full https Google Maps link on its own line. ' +
  'When sharing the booking calendar or property page, put one full https link on its own line. ' +
  'For lists, use short "- " bullet lines. ' +
  "Refuse other guests' bookings, owner finance/profit, staff info, or internal ops — say the host team will follow up. " +
  'Never invent facts.';

/** Speakable grounding — replace PHP labels so the Live model does not say "P H P". */
function factsTextForVoice(factsText: string): string {
  return factsText.replace(/\(PHP\)/gi, '(pesos)').replace(/\bPHP\b/g, 'pesos');
}

serveAuthenticated('voice-receptionist-start', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const limited = await rateLimitGate(req, {
    scope: 'voice-receptionist-start',
    identity: identityFromRequest(req, user),
    limit: 10,
    windowSec: 3600,
  });
  if (limited) return limited;

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
      .select('id, organization_id, name, tower, unit_number, tower_and_unit')
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

    try {
      await requirePropertyFeature(propertyId, 'aiReceptionist');
    } catch (err) {
      if (err instanceof PlanFeatureRequiredError) {
        return jsonUpgradeHook(req, err.message, { feature: err.feature });
      }
      throw err;
    }

    await enforceVoiceReceptionistCaps(propertyId, user.id, settings);

    try {
      await assertOrgAndPropertyAiQuota(orgId, propertyId, 'voice_receptionist');
    } catch (err) {
      if (isAiQuotaError(err) || isAiPlatformDisabledError(err)) {
        return jsonUpgradeHook(req, (err as Error).message, { feature: 'aiReceptionist' });
      }
      throw err;
    }

    const orgUsage = await getOrgAiUsageSummary(orgId);
    let effectiveMaxSessionSeconds = settings.maxSessionSeconds;
    const costRemaining = orgUsage.dailyCostRemaining;
    if (costRemaining <= 0) {
      return jsonUpgradeHook(req, 'Daily AI cost limit reached for this organization.', {
        feature: 'aiReceptionist',
      });
    }
    if (costRemaining < 1) {
      effectiveMaxSessionSeconds = Math.min(effectiveMaxSessionSeconds, 90);
    } else if (costRemaining < 3) {
      effectiveMaxSessionSeconds = Math.min(effectiveMaxSessionSeconds, 180);
    }

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
      inquiryCheckIn: conversation.inquiry_check_in ?? null,
      inquiryCheckOut: conversation.inquiry_check_out ?? null,
      // Voice prompt budget — property facts already cover FAQs; keep QR snippets short.
      maxQuickReplies: 5,
    });

    const personaOverride = settings.personaPrompt?.trim()
      ? `\nHost persona: ${settings.personaPrompt.trim()}`
      : '';
    const guestPropertyName = resolvePropertyGuestName(propertyRow);
    const systemInstruction =
      `${VOICE_SYSTEM_CORE} Property: ${guestPropertyName}.` +
      `${personaOverride}\n\nKnown facts:\n${factsTextForVoice(grounding.factsText)}`;

    // Mint before inserting the session row so a Gemini failure does not burn a daily-cap slot.
    const minted = await mintGeminiLiveEphemeralToken({
      voiceName: settings.voiceId,
      systemInstruction,
      expireMinutes: Math.max(Math.ceil(effectiveMaxSessionSeconds / 60) + 2, 5),
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
      maxSessionSeconds: effectiveMaxSessionSeconds,
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
