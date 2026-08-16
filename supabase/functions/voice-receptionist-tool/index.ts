/**
 * voice-receptionist-tool — Serves the getPropertyFact tool call the browser relays from an
 * active Gemini Live session. This allowlist is the hard security boundary (Architecture §1):
 * even a client-tampered system prompt cannot make the model return data outside it.
 * Auth: any signed-in guest (Supabase JWT); the session must belong to that guest.
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { loadVoiceReceptionistSessionForGuest } from '../_shared/voiceReceptionistService.ts';
import {
  answerGuestSafeVoiceTopic,
  matchGuestSafeVoiceTopic,
} from '../_shared/voiceReceptionistTool.ts';

serveAuthenticated('voice-receptionist-tool', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const body = await readJsonBody(req);
  const sessionId = String(body.sessionId ?? body.session_id ?? '').trim();
  const topic = String(body.topic ?? '').trim();
  if (!sessionId || !topic) {
    return jsonError(req, 'sessionId and topic are required', 400);
  }

  const session = await loadVoiceReceptionistSessionForGuest(sessionId, user.id);
  if (!session) {
    return jsonError(req, 'Voice session not found', 404);
  }
  if (session.endedAt) {
    return jsonError(req, 'Voice session has ended', 410);
  }

  const topicKey = matchGuestSafeVoiceTopic(topic);
  if (!topicKey) {
    return jsonError(req, `Topic "${topic}" is not supported by the voice receptionist.`, 400);
  }

  try {
    const answer = await answerGuestSafeVoiceTopic(session.propertyId, topicKey);
    return jsonSuccess(req, { topic: topicKey, answer });
  } catch (e) {
    const message = (e as Error).message;
    if (message === 'Property not found') {
      return jsonError(req, message, 404);
    }
    throw e;
  }
});
