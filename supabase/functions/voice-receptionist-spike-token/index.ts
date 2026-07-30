/**
 * voice-receptionist-spike-token — Throwaway mint endpoint for Gemini Live spike.
 * Auth: any signed-in user (serveAuthenticated). Not for production product flows.
 */

import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import {
  GEMINI_LIVE_MODEL,
  mintGeminiLiveEphemeralToken,
} from '../_shared/geminiLiveEphemeral.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('voice-receptionist-spike-token', async (req, _user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  try {
    const minted = await mintGeminiLiveEphemeralToken({
      model: GEMINI_LIVE_MODEL,
      voiceName: 'Kore',
      systemInstruction:
        'You are a spike test receptionist for a vacation rental. Be brief. ' +
        'When asked about property facts, call getPropertyFact. ' +
        'Refuse finance, other guests, or staff personal info.',
    });

    return jsonSuccess(req, {
      ephemeralToken: minted.ephemeralToken,
      model: minted.model,
      voiceId: minted.voiceName,
      expireTime: minted.expireTime,
      newSessionExpireTime: minted.newSessionExpireTime,
      lockedSessionConfig: minted.lockedSessionConfig,
      websocketPath:
        'v1alpha GenerativeService.BidiGenerateContentConstrained?access_token=…',
    });
  } catch (e) {
    const message = (e as Error).message;
    if (message.includes('not set')) {
      return jsonError(req, message, 503);
    }
    return jsonError(req, message, 502);
  }
});
