/**
 * voice-receptionist-end — Ends a guest voice receptionist session and batch-writes the
 * committed transcript into the property's existing social_messages thread (source_mode=
 * 'voice') so the admin Inbox shows unified history. Call on guest End, timeout, or error —
 * without this, `voice_receptionist_sessions.ended_at` never sets and concurrency caps stay
 * heuristic-only (see Task 2 report). Idempotent: retries on an already-ended session just
 * return the existing duration; transcript writes are deduped by a deterministic
 * external_message_id per (sessionId, turn index).
 * Auth: any signed-in guest (Supabase JWT); the session must belong to that guest.
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import {
  endVoiceReceptionistSession,
  loadVoiceReceptionistSessionForEnd,
  sanitizeVoiceTranscriptTurns,
  writeVoiceTranscriptToConversation,
  type VoiceReceptionistEndReason,
} from '../_shared/voiceReceptionistService.ts';
import { polishVoiceTranscriptTurns } from '../_shared/polishVoiceUtterance.ts';
import { resolveOrganizationIdForProperty } from '../_shared/propertyScope.ts';

const END_REASONS: VoiceReceptionistEndReason[] = [
  'guest_ended',
  'timeout',
  'cap_reached',
  'error',
];

serveAuthenticated('voice-receptionist-end', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const body = await readJsonBody(req);
  const sessionId = String(body.sessionId ?? body.session_id ?? '').trim();
  if (!sessionId) {
    return jsonError(req, 'sessionId is required', 400);
  }
  const endReasonRaw = String(body.endReason ?? body.end_reason ?? 'guest_ended').trim();
  const endReason = END_REASONS.includes(endReasonRaw as VoiceReceptionistEndReason)
    ? (endReasonRaw as VoiceReceptionistEndReason)
    : 'guest_ended';
  const turns = sanitizeVoiceTranscriptTurns(body.transcript);

  const session = await loadVoiceReceptionistSessionForEnd(sessionId, user.id);
  if (!session) {
    return jsonError(req, 'Voice session not found', 404);
  }

  const result = await endVoiceReceptionistSession(session, endReason, user.id);

  if (session.conversationId && turns.length) {
    try {
      const organizationId = await resolveOrganizationIdForProperty(session.propertyId);
      const polishedTurns = await polishVoiceTranscriptTurns(turns, {
        organizationId,
        propertyId: session.propertyId,
        actorUserId: user.id,
        actorType: 'guest',
      });
      await writeVoiceTranscriptToConversation(
        session.id,
        session.conversationId,
        user.id,
        session.startedAt,
        polishedTurns
      );
    } catch (e) {
      console.error('[voice-receptionist-end] transcript write failed:', (e as Error).message);
    }
  }

  return jsonSuccess(req, result);
});
